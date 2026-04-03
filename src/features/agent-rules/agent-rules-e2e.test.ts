import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createAgentRulesContext } from "./create-agent-rules-context";
import { resolveAgentRules } from "./rule-resolver";

function writeRuleFile(dir: string, name: string, content: string): void {
  const filePath = join(dir, name);
  writeFileSync(filePath, content, "utf-8");
}

describe("agent-rules E2E", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync("/tmp/test-agent-rules-e2e-");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("#given a project with global and per-agent rules", () => {
    let rulesDir: string;
    let hephaestusDir: string;
    let oracleDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      hephaestusDir = join(rulesDir, "agents", "hephaestus");
      oracleDir = join(rulesDir, "agents", "oracle");
      mkdirSync(hephaestusDir, { recursive: true });
      mkdirSync(oracleDir, { recursive: true });

      writeRuleFile(rulesDir, "global-rule.md", "Always write tests for new code.");
      writeRuleFile(hephaestusDir, "hephaestus-rule.md", "Use TDD when implementing features.");
      writeRuleFile(oracleDir, "oracle-rule.md", "Use grep_app for code search.");
    });

    describe("#when resolving rules via createAgentRulesContext for hephaestus", () => {
      it("#then includes global rule and hephaestus-specific rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("hephaestus");

        expect(result).toContain("Always write tests for new code.");
        expect(result).toContain("Use TDD when implementing features.");
      });

      it("#then excludes oracle-specific rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("hephaestus");

        expect(result).not.toContain("Use grep_app for code search.");
      });
    });

    describe("#when resolving rules via createAgentRulesContext for oracle", () => {
      it("#then includes global rule and oracle-specific rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("oracle");

        expect(result).toContain("Always write tests for new code.");
        expect(result).toContain("Use grep_app for code search.");
      });

      it("#then excludes hephaestus-specific rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("oracle");

        expect(result).not.toContain("Use TDD when implementing features.");
      });
    });

    describe("#when resolving rules for an agent with no specific rules", () => {
      it("#then returns only global rule content", async () => {
        const context = await createAgentRulesContext(tmpDir, [], []);
        const result = context.resolveRules("librarian");

        expect(result).toContain("Always write tests for new code.");
        expect(result).not.toContain("Use TDD when implementing features.");
        expect(result).not.toContain("Use grep_app for code search.");
      });
    });
  });

  describe("#given rules with explicit agent frontmatter", () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
    });

    describe("#when rule specifies multiple agents in frontmatter", () => {
      it("#then resolves for each listed agent", async () => {
        const content = `---\nagents: [sisyphus, hephaestus]\n---\nMulti-agent rule.`;
        writeRuleFile(rulesDir, "multi-agent.md", content);

        const context = await createAgentRulesContext(tmpDir, [], []);

        expect(context.resolveRules("sisyphus")).toContain("Multi-agent rule.");
        expect(context.resolveRules("hephaestus")).toContain("Multi-agent rule.");
      });

      it("#then excludes for agents not listed in frontmatter", async () => {
        const content = `---\nagents: [sisyphus, hephaestus]\n---\nMulti-agent rule.`;
        writeRuleFile(rulesDir, "multi-agent.md", content);

        const context = await createAgentRulesContext(tmpDir, [], []);

        expect(context.resolveRules("oracle")).toBe("");
      });
    });

    describe("#when rule specifies a category in frontmatter", () => {
      it("#then resolves when matching category is passed", async () => {
        const content = `---\ncategories: [deep]\n---\nDeep category rule.`;
        writeRuleFile(rulesDir, "deep-category.md", content);

        const context = await createAgentRulesContext(tmpDir, [], []);

        expect(context.resolveRules("hephaestus", "deep")).toContain("Deep category rule.");
      });

      it("#then excludes when different category is passed", async () => {
        const content = `---\ncategories: [deep]\n---\nDeep category rule.`;
        writeRuleFile(rulesDir, "deep-category.md", content);

        const context = await createAgentRulesContext(tmpDir, [], []);

        expect(context.resolveRules("hephaestus", "quick")).toBe("");
      });
    });
  });

  describe("#given disabled rules configured at context creation", () => {
    let rulesDir: string;

    beforeEach(() => {
      rulesDir = join(tmpDir, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeRuleFile(rulesDir, "enabled-rule.md", "This rule is enabled.");
      writeRuleFile(rulesDir, "disabled-rule.md", "This rule is disabled.");
    });

    describe("#when disabled rule is excluded by stem name", () => {
      it("#then resolveRules omits the disabled rule", async () => {
        const context = await createAgentRulesContext(tmpDir, [], ["disabled-rule"]);
        const result = context.resolveRules("sisyphus");

        expect(result).toContain("This rule is enabled.");
        expect(result).not.toContain("This rule is disabled.");
      });
    });

    describe("#when resolveRules is called directly on loaded rules", () => {
      it("#then honours the disabledSet from context", async () => {
        const context = await createAgentRulesContext(tmpDir, [], ["disabled-rule"]);
        const direct = resolveAgentRules(context.rules, "sisyphus", undefined, context.disabledRules);

        expect(direct).toContain("This rule is enabled.");
        expect(direct).not.toContain("This rule is disabled.");
      });
    });
  });

  describe("#given a custom config directory for additional rules", () => {
    let primaryRulesDir: string;
    let customRulesDir: string;

    beforeEach(() => {
      primaryRulesDir = join(tmpDir, ".sisyphus", "rules");
      customRulesDir = join(tmpDir, "custom-rules");
      mkdirSync(primaryRulesDir, { recursive: true });
      mkdirSync(customRulesDir, { recursive: true });

      writeRuleFile(primaryRulesDir, "primary-rule.md", "Primary rule content.");
      writeRuleFile(customRulesDir, "custom-rule.md", "Custom rule content.");
    });

    describe("#when configDirs includes the custom directory", () => {
      it("#then resolves rules from both directories", async () => {
        const context = await createAgentRulesContext(tmpDir, [customRulesDir], []);
        const result = context.resolveRules("sisyphus");

        expect(result).toContain("Primary rule content.");
        expect(result).toContain("Custom rule content.");
      });

      it("#then total rule count reflects both sources", async () => {
        const context = await createAgentRulesContext(tmpDir, [customRulesDir], []);
        expect(context.rules.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
