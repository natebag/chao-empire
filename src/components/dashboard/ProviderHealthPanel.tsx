import { useEffect, useState } from "react";

interface ProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastCheckAt: number | null;
  avgResponseMs: number;
  errorCount24h: number;
  lastErrorMessage: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
  unknown: "bg-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

export default function ProviderHealthPanel() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const res = await fetch("/api/models/health");
        if (!res.ok) return;
        const data: ProviderHealth[] = await res.json();
        if (!cancelled) setProviders(data);
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
        Provider Health
      </h3>

      {providers.length === 0 ? (
        <p className="text-sm text-slate-500">No provider data yet</p>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.provider}
              className="flex items-center gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
            >
              {/* Status dot */}
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[p.status] ?? STATUS_COLORS.unknown}`}
              />

              {/* Provider name */}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                {p.provider}
              </span>

              {/* Status label */}
              <span className="text-xs text-slate-400">
                {STATUS_LABELS[p.status] ?? "Unknown"}
              </span>

              {/* Avg response time */}
              <span className="w-16 text-right text-xs tabular-nums text-slate-400">
                {Math.round(p.avgResponseMs)}ms
              </span>

              {/* Error count */}
              <span
                className={`w-12 text-right text-xs tabular-nums ${
                  p.errorCount24h > 0 ? "text-red-400" : "text-slate-500"
                }`}
              >
                {p.errorCount24h} err
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
