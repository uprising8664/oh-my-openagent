export interface AgentRuleMetadata {
  agents?: string[];
  categories?: string[];
  scope?: "global";
  description?: string;
}

export interface AgentRule {
  filePath: string;
  relativePath: string;
  metadata: AgentRuleMetadata;
  content: string;
  contentHash: string;
}

export interface AgentRulesContext {
  rules: AgentRule[];
  resolveRules: (agentName: string, categoryName?: string) => string;
  disabledRules: Set<string>;
}
