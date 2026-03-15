export interface ModelFallback {
  provider: string;
  model: string;
  triggerOn: "rate_limit" | "error" | "timeout";
}

export interface AgentModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  fallbacks?: ModelFallback[];
}

export interface ResolvedModel {
  provider: string;
  model: string;
  apiKey?: string;
  isFallback: boolean;
  fallbackReason?: string;
}

export interface ProviderHealthStatus {
  provider: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastCheckAt: number | null;
  avgResponseMs: number;
  errorCount24h: number;
  lastErrorMessage: string | null;
}
