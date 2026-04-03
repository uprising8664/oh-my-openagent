import type { AgentRule } from "./types";

export function deduplicateRules(rules: AgentRule[]): AgentRule[] {
  const seen = new Set<string>();
  const result: AgentRule[] = [];

  for (const rule of rules) {
    if (!seen.has(rule.contentHash)) {
      seen.add(rule.contentHash);
      result.push(rule);
    }
  }

  return result;
}
