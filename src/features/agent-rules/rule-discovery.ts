import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import {
  AGENT_RULES_AGENTS_SUBDIR,
  AGENT_RULES_CATEGORIES_SUBDIR,
  AGENT_RULES_CONVENTION_DIRS,
  AGENT_RULES_FILE_EXTENSIONS,
  AGENT_RULES_USER_DIRS,
} from "./constants";

function isValidRuleFile(fileName: string): boolean {
  return AGENT_RULES_FILE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function safeRealpathSync(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return filePath;
  }
}

function scanDirectory(dir: string, results: string[]): void {
  if (!existsSync(dir)) return;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && isValidRuleFile(entry.name)) {
        results.push(join(dir, entry.name));
      }
    }
  } catch {
    // Permission denied or other errors - silently skip
  }
}

function scanRulesRoot(rulesDir: string, seen: Set<string>, results: string[]): void {
  scanDirectory(rulesDir, results);

  const agentsDir = join(rulesDir, AGENT_RULES_AGENTS_SUBDIR);
  if (existsSync(agentsDir)) {
    try {
      const agentEntries = readdirSync(agentsDir, { withFileTypes: true });
      for (const entry of agentEntries) {
        if (entry.isDirectory()) {
          scanDirectory(join(agentsDir, entry.name), results);
        }
      }
    } catch {
      // Permission denied or other errors - silently skip
    }
  }

  const categoriesDir = join(rulesDir, AGENT_RULES_CATEGORIES_SUBDIR);
  if (existsSync(categoriesDir)) {
    try {
      const categoryEntries = readdirSync(categoriesDir, { withFileTypes: true });
      for (const entry of categoryEntries) {
        if (entry.isDirectory()) {
          scanDirectory(join(categoriesDir, entry.name), results);
        }
      }
    } catch {
      // Permission denied or other errors - silently skip
    }
  }

  const unique: string[] = [];
  for (const file of results) {
    const real = safeRealpathSync(file);
    if (!seen.has(real)) {
      seen.add(real);
      unique.push(file);
    }
  }
  results.length = 0;
  results.push(...unique);
}

function expandHome(dir: string): string {
  if (dir.startsWith("~/")) {
    return join(process.env.HOME ?? "", dir.slice(2));
  }
  return dir;
}

export async function discoverAgentRuleFiles(
  projectRoot: string,
  configDirs: string[],
): Promise<string[]> {
  const seen = new Set<string>();
  const all: string[] = [];

  for (const conventionDir of AGENT_RULES_CONVENTION_DIRS) {
    const rulesDir = join(projectRoot, conventionDir);
    const batch: string[] = [];
    scanRulesRoot(rulesDir, seen, batch);
    all.push(...batch);
  }

  for (const userDir of AGENT_RULES_USER_DIRS) {
    const rulesDir = expandHome(userDir);
    const batch: string[] = [];
    scanRulesRoot(rulesDir, seen, batch);
    all.push(...batch);
  }

  for (const extraDir of configDirs) {
    const rulesDir = expandHome(extraDir);
    const batch: string[] = [];
    scanRulesRoot(rulesDir, seen, batch);
    all.push(...batch);
  }

  return all;
}
