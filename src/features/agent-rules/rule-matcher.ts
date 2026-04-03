import { AGENT_RULES_AGENTS_SUBDIR, AGENT_RULES_CATEGORIES_SUBDIR } from "./constants";
import type { AgentRule } from "./types";

export function matchesAgent(rule: AgentRule, agentName: string): boolean {
  if (rule.metadata.agents && rule.metadata.agents.length > 0) {
    return rule.metadata.agents.includes(agentName);
  }

  const agentPathSegment = `/${AGENT_RULES_AGENTS_SUBDIR}/${agentName}/`;
  return rule.filePath.includes(agentPathSegment);
}

export function matchesCategory(rule: AgentRule, categoryName: string): boolean {
  if (rule.metadata.categories && rule.metadata.categories.length > 0) {
    return rule.metadata.categories.includes(categoryName);
  }

  const categoryPathSegment = `/${AGENT_RULES_CATEGORIES_SUBDIR}/${categoryName}/`;
  return rule.filePath.includes(categoryPathSegment);
}

function isInScopedSubdir(filePath: string): boolean {
  const agentsSegment = `/${AGENT_RULES_AGENTS_SUBDIR}/`;
  const categoriesSegment = `/${AGENT_RULES_CATEGORIES_SUBDIR}/`;
  return filePath.includes(agentsSegment) || filePath.includes(categoriesSegment);
}

function isGlobalRule(rule: AgentRule): boolean {
  const hasAgents = rule.metadata.agents && rule.metadata.agents.length > 0;
  const hasCategories = rule.metadata.categories && rule.metadata.categories.length > 0;
  const hasScope = rule.metadata.scope !== undefined;

  if (hasAgents || hasCategories || hasScope) {
    return false;
  }

  return !isInScopedSubdir(rule.filePath);
}

export function matchesAgentOrCategory(
  rule: AgentRule,
  agentName: string,
  categoryName?: string
): boolean {
  if (rule.metadata.scope === "global") {
    return true;
  }

  if (isGlobalRule(rule)) {
    return true;
  }

  const hasAgentMeta = rule.metadata.agents && rule.metadata.agents.length > 0;
  const hasCategoryMeta = rule.metadata.categories && rule.metadata.categories.length > 0;

  if (hasAgentMeta || hasCategoryMeta) {
    if (hasAgentMeta && rule.metadata.agents!.includes(agentName)) {
      return true;
    }
    if (hasCategoryMeta && categoryName && rule.metadata.categories!.includes(categoryName)) {
      return true;
    }
    return false;
  }

  const agentPathSegment = `/${AGENT_RULES_AGENTS_SUBDIR}/${agentName}/`;
  if (rule.filePath.includes(agentPathSegment)) {
    return true;
  }

  if (categoryName) {
    const categoryPathSegment = `/${AGENT_RULES_CATEGORIES_SUBDIR}/${categoryName}/`;
    if (rule.filePath.includes(categoryPathSegment)) {
      return true;
    }
  }

  if (isInScopedSubdir(rule.filePath)) {
    return false;
  }

  return false;
}
