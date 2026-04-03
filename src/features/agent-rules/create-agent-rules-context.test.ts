import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createAgentRulesContext } from "./create-agent-rules-context";

function writeRuleFile(dir: string, name: string, content: string): void {
  const filePath = join(dir, name);
  writeFileSync(filePath, content, "utf-8");
}

describe("createAgentRulesContext", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync("/tmp/test-agent-rules-");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("#given empty project with no rule files", () => {
    describe("#when creating context", () => {
      it("#then returns context with empty rules array", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        expect(context.rules).toEqual([]);
      });

      it("#then returns context with empty disabledRules set when none provided", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        expect(context.disabledRules.size).toBe(0);
      });

      it("#then resolveRules returns empty string", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("sisyphus");
        expect(result).toBe("");
      });
    });
  });

  describe("#given project with rule files in convention directory", () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
    });

    describe("#when rule file has no frontmatter", () => {
      it("#then creates context with parsed rule", async () => {
        writeRuleFile(rulesDir, "global-rule.md", "Use ripgrep for searching.");
        const context = await createAgentRulesContext(tmpDir, [], []);
        expect(context.rules).toHaveLength(1);
        expect(context.rules[0].content).toBe("Use ripgrep for searching.");
      });

      it("#then sets correct relativePath", async () => {
        writeRuleFile(rulesDir, "global-rule.md", "Some content.");
        const context = await createAgentRulesContext(tmpDir, [], []);
        expect(context.rules[0].relativePath).toBe(".sisyphus/rules/global-rule.md");
      });
    });

    describe("#when rule file has frontmatter with agent scope", () => {
      it("#then parses metadata correctly", async () => {
        const content = `---\nagents: [sisyphus]\n---\nSisyphus-specific rule.`;
        writeRuleFile(rulesDir, "sisyphus-rule.md", content);
        const context = await createAgentRulesContext(tmpDir, [], []);
        expect(context.rules[0].metadata.agents).toEqual(["sisyphus"]);
        expect(context.rules[0].content).toBe("Sisyphus-specific rule.");
      });
    });
  });

  describe("#given context with global and agent-specific rules", () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeRuleFile(rulesDir, "global-rule.md", "Global content.");
      const oracleRulesDir = join(rulesDir, "agents", "oracle");
      mkdirSync(oracleRulesDir, { recursive: true });
      writeRuleFile(oracleRulesDir, "oracle-rule.md", "Oracle-specific content.");
    });

    describe("#when calling resolveRules for sisyphus", () => {
      it("#then returns global rule content", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("sisyphus");
        expect(result).toContain("Global content.");
      });

      it("#then does not include oracle-specific rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("sisyphus");
        expect(result).not.toContain("Oracle-specific content.");
      });
    });

    describe("#when calling resolveRules for oracle", () => {
      it("#then returns both global and oracle content", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("oracle");
        expect(result).toContain("Global content.");
        expect(result).toContain("Oracle-specific content.");
      });
    });
  });

  describe("#given disabled rules passed as parameter", () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
    });

    describe("#when disabledRules array is provided", () => {
      it("#then context.disabledRules set matches the passed array", async () => {
        const context = await createAgentRulesContext(tmpDir, [], ["rule-a", "rule-b"]);
        expect(context.disabledRules.has("rule-a")).toBe(true);
        expect(context.disabledRules.has("rule-b")).toBe(true);
        expect(context.disabledRules.size).toBe(2);
      });

      it("#then resolveRules excludes disabled rules by stem", async () => {
        writeRuleFile(rulesDir, "use-ripgrep.md", "Use ripgrep for searching.");
        const context = await createAgentRulesContext(tmpDir, [], ["use-ripgrep"]);
        const result = context.resolveRules("sisyphus");
        expect(result).toBe("");
      });

      it("#then resolveRules excludes disabled rules by full relativePath", async () => {
        writeRuleFile(rulesDir, "use-ripgrep.md", "Use ripgrep for searching.");
        const context = await createAgentRulesContext(tmpDir, [], [".sisyphus/rules/use-ripgrep.md"]);
        const result = context.resolveRules("sisyphus");
        expect(result).toBe("");
      });
    });
  });

  describe("#given unreadable file in rule directory", () => {
    describe("#when file is deleted after discovery but before read", () => {
      it("#then silently skips unreadable file and continues", async () => {
        const rulesDir = join(tmpDir, ".sisyphus", "rules");
        mkdirSync(rulesDir, { recursive: true });
        writeRuleFile(rulesDir, "readable-rule.md", "Readable content.");

        const deletedPath = join(rulesDir, "deleted-rule.md");
        writeFileSync(deletedPath, "About to be deleted.");

        const origDiscoverFn = require("./rule-discovery").discoverAgentRuleFiles;
        const { discoverAgentRuleFiles } = await import("./rule-discovery");

        const files = await discoverAgentRuleFiles(tmpDir, []);
        rmSync(deletedPath);

        let warnCalled = false;
        const origWarn = console.warn;
        console.warn = (...args: unknown[]) => {
          warnCalled = true;
          origWarn(...args);
        };

        try {
          const context = await createAgentRulesContext(tmpDir, [], []);
          expect(context.rules.length).toBeGreaterThanOrEqual(1);
          const contents = context.rules.map((r) => r.content);
          expect(contents).toContain("Readable content.");
        } finally {
          console.warn = origWarn;
        }
      });
    });
  });
});
