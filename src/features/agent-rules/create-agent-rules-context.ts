import { relative } from "node:path";
import type { AgentRule, AgentRulesContext } from "./types";
import { discoverAgentRuleFiles } from "./rule-discovery";
import { parseAgentRuleFrontmatter } from "./rule-parser";
import { resolveAgentRules } from "./rule-resolver";

async function readRuleFile(filePath: string): Promise<string | null> {
  try {
    return await Bun.file(filePath).text();
  } catch (err) {
    console.warn(`[agent-rules] Failed to read rule file: ${filePath}`, err);
    return null;
  }
}

function buildAgentRule(filePath: string, projectRoot: string, content: string): AgentRule {
  const parsed = parseAgentRuleFrontmatter(content);
  return {
    filePath,
    relativePath: relative(projectRoot, filePath),
    metadata: parsed.metadata,
    content: parsed.body,
    contentHash: parsed.contentHash,
  };
}

export async function createAgentRulesContext(
  projectRoot: string,
  configDirs: string[],
  disabledRules: string[],
): Promise<AgentRulesContext> {
  const filePaths = await discoverAgentRuleFiles(projectRoot, configDirs);
  const rules: AgentRule[] = [];

  for (const filePath of filePaths) {
    const content = await readRuleFile(filePath);
    if (content === null) continue;
    rules.push(buildAgentRule(filePath, projectRoot, content));
  }

  const disabledSet = new Set(disabledRules);

  return {
    rules,
    disabledRules: disabledSet,
    resolveRules: (agentName: string, categoryName?: string) =>
      resolveAgentRules(rules, agentName, categoryName, disabledSet),
  };
}
