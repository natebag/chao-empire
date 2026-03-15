import type { AgentModelConfig, ModelFallback, ResolvedModel } from "./types.js";

const HARDCODED_FALLBACK: ResolvedModel = {
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  isFallback: true,
  fallbackReason: "No agent config or system default available; using hardcoded fallback",
};

/**
 * Parse a "provider/model" string into its parts.
 * Returns null if the format is invalid.
 */
function parseModelString(raw: string): { provider: string; model: string } | null {
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0 || slashIndex === raw.length - 1) {
    return null;
  }
  return {
    provider: raw.slice(0, slashIndex),
    model: raw.slice(slashIndex + 1),
  };
}

/**
 * Resolve which model an agent should use.
 *
 * Priority order:
 *   1. Agent-level config (parsed from agentModelConfig JSON or "provider/model" string)
 *   2. System default (parsed as "provider/model")
 *   3. Hardcoded fallback: anthropic/claude-sonnet-4-5
 */
export function resolveModelForAgent(
  agentModelConfig: string | null,
  systemDefault: string | null,
): ResolvedModel {
  // 1. Try agent-level config
  if (agentModelConfig !== null && agentModelConfig.trim() !== "") {
    const trimmed = agentModelConfig.trim();

    // Attempt JSON parse first (full AgentModelConfig object)
    try {
      const parsed: AgentModelConfig = JSON.parse(trimmed);
      if (parsed.provider && parsed.model) {
        return {
          provider: parsed.provider,
          model: parsed.model,
          apiKey: parsed.apiKey,
          isFallback: false,
        };
      }
    } catch {
      // Not JSON — try "provider/model" format
    }

    const parts = parseModelString(trimmed);
    if (parts) {
      return {
        provider: parts.provider,
        model: parts.model,
        isFallback: false,
      };
    }
  }

  // 2. Try system default
  if (systemDefault !== null && systemDefault.trim() !== "") {
    const parts = parseModelString(systemDefault.trim());
    if (parts) {
      return {
        provider: parts.provider,
        model: parts.model,
        isFallback: true,
        fallbackReason: "Using system default; no valid agent config",
      };
    }
  }

  // 3. Hardcoded fallback
  return { ...HARDCODED_FALLBACK };
}

/**
 * Given the agent's model config, a failure type, and the set of providers
 * already attempted, return the next fallback model to try — or null if
 * no more fallbacks are available.
 */
export function getNextFallback(
  agentModelConfig: string | null,
  failureType: "rate_limit" | "error" | "timeout",
  attemptedProviders: ReadonlySet<string>,
): ResolvedModel | null {
  if (agentModelConfig === null || agentModelConfig.trim() === "") {
    return null;
  }

  let fallbacks: ModelFallback[] | undefined;

  try {
    const parsed: AgentModelConfig = JSON.parse(agentModelConfig.trim());
    fallbacks = parsed.fallbacks;
  } catch {
    return null;
  }

  if (!fallbacks || fallbacks.length === 0) {
    return null;
  }

  for (const fb of fallbacks) {
    // Skip providers we already tried
    if (attemptedProviders.has(fb.provider)) {
      continue;
    }

    // Only use this fallback if the trigger matches
    if (fb.triggerOn !== failureType) {
      continue;
    }

    return {
      provider: fb.provider,
      model: fb.model,
      isFallback: true,
      fallbackReason: `Fallback triggered by ${failureType}`,
    };
  }

  return null;
}
