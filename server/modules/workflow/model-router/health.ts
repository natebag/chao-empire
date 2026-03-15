import type { DatabaseSync } from "node:sqlite";
import type { ProviderHealthStatus } from "./types.js";

/**
 * Record a successful request to a provider.
 */
export function recordSuccess(
  db: DatabaseSync,
  provider: string,
  responseMs: number,
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health (
      provider       TEXT PRIMARY KEY,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_response_ms REAL NOT NULL DEFAULT 0,
      error_count_24h INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT,
      last_check_at  INTEGER
    )
  `);

  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO provider_health (provider, total_requests, total_response_ms, error_count_24h, last_error_message, last_check_at)
    VALUES (?, 1, ?, 0, NULL, ?)
    ON CONFLICT(provider) DO UPDATE SET
      total_requests    = total_requests + 1,
      total_response_ms = total_response_ms + ?,
      last_check_at     = ?
  `);
  stmt.run(provider, responseMs, now, responseMs, now);
}

/**
 * Record a failed request to a provider.
 */
export function recordFailure(
  db: DatabaseSync,
  provider: string,
  errorMessage: string,
): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health (
      provider       TEXT PRIMARY KEY,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_response_ms REAL NOT NULL DEFAULT 0,
      error_count_24h INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT,
      last_check_at  INTEGER
    )
  `);

  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO provider_health (provider, total_requests, total_response_ms, error_count_24h, last_error_message, last_check_at)
    VALUES (?, 1, 0, 1, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      total_requests     = total_requests + 1,
      error_count_24h    = error_count_24h + 1,
      last_error_message = ?,
      last_check_at      = ?
  `);
  stmt.run(provider, errorMessage, now, errorMessage, now);
}

/**
 * Derive a health status label from error count and average response time.
 */
function deriveStatus(
  errorCount24h: number,
  avgResponseMs: number,
  totalRequests: number,
): ProviderHealthStatus["status"] {
  if (totalRequests === 0) {
    return "unknown";
  }
  if (errorCount24h >= 10) {
    return "down";
  }
  if (errorCount24h >= 3 || avgResponseMs > 10_000) {
    return "degraded";
  }
  return "healthy";
}

/**
 * Retrieve health status for all known providers.
 */
export function getAllProviderHealth(db: DatabaseSync): ProviderHealthStatus[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health (
      provider       TEXT PRIMARY KEY,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_response_ms REAL NOT NULL DEFAULT 0,
      error_count_24h INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT,
      last_check_at  INTEGER
    )
  `);

  const stmt = db.prepare(`
    SELECT provider, total_requests, total_response_ms, error_count_24h, last_error_message, last_check_at
    FROM provider_health
    ORDER BY provider
  `);

  const rows = stmt.all() as Array<{
    provider: string;
    total_requests: number;
    total_response_ms: number;
    error_count_24h: number;
    last_error_message: string | null;
    last_check_at: number | null;
  }>;

  return rows.map((row) => {
    const avgResponseMs =
      row.total_requests > 0
        ? Math.round(row.total_response_ms / row.total_requests)
        : 0;

    return {
      provider: row.provider,
      status: deriveStatus(row.error_count_24h, avgResponseMs, row.total_requests),
      lastCheckAt: row.last_check_at,
      avgResponseMs,
      errorCount24h: row.error_count_24h,
      lastErrorMessage: row.last_error_message,
    };
  });
}

/**
 * Reset the 24-hour error counters for all providers.
 * Intended to be called by a daily scheduled task.
 */
export function resetDailyErrors(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health (
      provider       TEXT PRIMARY KEY,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_response_ms REAL NOT NULL DEFAULT 0,
      error_count_24h INTEGER NOT NULL DEFAULT 0,
      last_error_message TEXT,
      last_check_at  INTEGER
    )
  `);

  const stmt = db.prepare(`
    UPDATE provider_health SET error_count_24h = 0
  `);
  stmt.run();
}
