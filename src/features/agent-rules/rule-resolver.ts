import { basename, extname } from "node:path";
import type { AgentRule } from "./types";
import { matchesAgentOrCategory } from "./rule-matcher";
import { deduplicateRules } from "./rule-dedup";

function getRuleStem(relativePath: string): string {
  return basename(relativePath, extname(relativePath));
}

function isDisabled(rule: AgentRule, disabledRules: Set<string>): boolean {
  const stem = getRuleStem(rule.relativePath);
  return disabledRules.has(stem) || disabledRules.has(rule.relativePath);
}

export function resolveAgentRules(
  rules: AgentRule[],
  agentName: string,
  categoryName?: string,
  disabledRules?: Set<string>,
): string {
  const disabled = disabledRules ?? new Set<string>();

  const matching = rules.filter(
    (rule) => matchesAgentOrCategory(rule, agentName, categoryName) && !isDisabled(rule, disabled),
  );

  const deduplicated = deduplicateRules(matching);

  if (deduplicated.length === 0) {
    return "";
  }

  return deduplicated.map((rule) => rule.content).join("\n\n");
}
