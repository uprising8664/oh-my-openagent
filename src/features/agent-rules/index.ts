export type { AgentRule, AgentRuleMetadata, AgentRulesContext } from "./types";
export {
  AGENT_RULES_AGENTS_SUBDIR,
  AGENT_RULES_CATEGORIES_SUBDIR,
  AGENT_RULES_CONVENTION_DIRS,
  AGENT_RULES_FILE_EXTENSIONS,
  AGENT_RULES_USER_DIRS,
} from "./constants";
export { discoverAgentRuleFiles } from "./rule-discovery";
export { matchesAgent, matchesAgentOrCategory, matchesCategory } from "./rule-matcher";
export { deduplicateRules } from "./rule-dedup";
