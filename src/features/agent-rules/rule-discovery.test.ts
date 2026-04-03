import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgentRuleFiles } from "./rule-discovery";

describe("discoverAgentRuleFiles", () => {
  const TEST_DIR = join(tmpdir(), `agent-rules-discovery-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("#given missing directories", () => {
    it("should return empty array when no rule directories exist", async () => {
      // when discovering from an empty project
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then no files returned, no errors thrown
      expect(result).toEqual([]);
    });

    it("should skip missing convention dirs silently", async () => {
      // given no .sisyphus/rules or .opencode/rules directories
      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then returns empty without throwing
      expect(result).toBeArray();
      expect(result.length).toBe(0);
    });

    it("should skip missing extra configDirs silently", async () => {
      // given a non-existent extra directory
      const missingDir = join(TEST_DIR, "does-not-exist");

      // when discovering with that extra dir
      const result = await discoverAgentRuleFiles(TEST_DIR, [missingDir]);

      // then no error, empty result
      expect(result).toEqual([]);
    });
  });

  describe("#given top-level rule files in convention dirs", () => {
    it("should discover .md files in .sisyphus/rules/", async () => {
      // given a .md file at the top level of .sisyphus/rules
      const rulesDir = join(TEST_DIR, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, "global.md"), "# Global rule");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then finds the file
      expect(result.some((p) => p.endsWith("global.md"))).toBe(true);
    });

    it("should discover .mdc files in .opencode/rules/", async () => {
      // given a .mdc file at the top level of .opencode/rules
      const rulesDir = join(TEST_DIR, ".opencode", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, "style.mdc"), "style rules");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then finds the .mdc file
      expect(result.some((p) => p.endsWith("style.mdc"))).toBe(true);
    });

    it("should only return .md and .mdc files, not other extensions", async () => {
      // given mixed file types at top-level
      const rulesDir = join(TEST_DIR, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, "valid.md"), "valid");
      writeFileSync(join(rulesDir, "valid.mdc"), "valid");
      writeFileSync(join(rulesDir, "invalid.txt"), "invalid");
      writeFileSync(join(rulesDir, "invalid.json"), "{}");
      writeFileSync(join(rulesDir, "invalid.yaml"), "key: val");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then only .md and .mdc are returned
      expect(result.some((p) => p.endsWith("valid.md"))).toBe(true);
      expect(result.some((p) => p.endsWith("valid.mdc"))).toBe(true);
      expect(result.some((p) => p.endsWith("invalid.txt"))).toBe(false);
      expect(result.some((p) => p.endsWith("invalid.json"))).toBe(false);
      expect(result.some((p) => p.endsWith("invalid.yaml"))).toBe(false);
    });
  });

  describe("#given agents subdirectory structure", () => {
    it("should discover files in .sisyphus/rules/agents/{name}/", async () => {
      // given agent-specific rule files
      const agentRulesDir = join(TEST_DIR, ".sisyphus", "rules", "agents", "sisyphus");
      mkdirSync(agentRulesDir, { recursive: true });
      writeFileSync(join(agentRulesDir, "rules.md"), "# Sisyphus rules");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then finds the agent-specific rule
      expect(result.some((p) => p.includes("agents") && p.includes("sisyphus") && p.endsWith("rules.md"))).toBe(true);
    });

    it("should discover files across multiple agent subdirectories", async () => {
      // given multiple agent subdirectories
      const agents = ["sisyphus", "hephaestus", "oracle"];
      for (const agent of agents) {
        const dir = join(TEST_DIR, ".opencode", "rules", "agents", agent);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${agent}.md`), `rules for ${agent}`);
      }

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then all agent files are discovered
      for (const agent of agents) {
        expect(result.some((p) => p.includes(agent) && p.endsWith(`${agent}.md`))).toBe(true);
      }
    });
  });

  describe("#given categories subdirectory structure", () => {
    it("should discover files in .sisyphus/rules/categories/{name}/", async () => {
      // given category-specific rule files
      const categoryDir = join(TEST_DIR, ".sisyphus", "rules", "categories", "visual-engineering");
      mkdirSync(categoryDir, { recursive: true });
      writeFileSync(join(categoryDir, "design.md"), "# Design rules");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then finds the category-specific rule
      expect(result.some((p) => p.includes("categories") && p.includes("visual-engineering") && p.endsWith("design.md"))).toBe(true);
    });

    it("should discover files across multiple category subdirectories", async () => {
      // given multiple category subdirectories
      const categories = ["quick", "deep", "ultrabrain"];
      for (const cat of categories) {
        const dir = join(TEST_DIR, ".opencode", "rules", "categories", cat);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${cat}.md`), `rules for ${cat}`);
      }

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then all category files are discovered
      for (const cat of categories) {
        expect(result.some((p) => p.includes(cat) && p.endsWith(`${cat}.md`))).toBe(true);
      }
    });
  });

  describe("#given both convention dirs present", () => {
    it("should discover files from both .sisyphus/rules and .opencode/rules", async () => {
      // given files in both convention dirs
      const sisyphusDir = join(TEST_DIR, ".sisyphus", "rules");
      const opencodeDir = join(TEST_DIR, ".opencode", "rules");
      mkdirSync(sisyphusDir, { recursive: true });
      mkdirSync(opencodeDir, { recursive: true });
      writeFileSync(join(sisyphusDir, "sisyphus-rule.md"), "sisyphus");
      writeFileSync(join(opencodeDir, "opencode-rule.md"), "opencode");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then both files are found
      expect(result.some((p) => p.endsWith("sisyphus-rule.md"))).toBe(true);
      expect(result.some((p) => p.endsWith("opencode-rule.md"))).toBe(true);
    });
  });

  describe("#given deduplication requirement", () => {
    it("should not return duplicate paths when the same file appears via multiple scans", async () => {
      // given a file in .sisyphus/rules/
      const rulesDir = join(TEST_DIR, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, "dedup.md"), "content");

      // when discovering with extra dir pointing to same location
      const result = await discoverAgentRuleFiles(TEST_DIR, [rulesDir]);

      // then dedup.md appears only once
      const dupCount = result.filter((p) => p.endsWith("dedup.md")).length;
      expect(dupCount).toBe(1);
    });

    it("should return each file path exactly once across all sources", async () => {
      // given files spread across multiple sources
      const sisyphusDir = join(TEST_DIR, ".sisyphus", "rules");
      const agentDir = join(TEST_DIR, ".sisyphus", "rules", "agents", "oracle");
      const categoryDir = join(TEST_DIR, ".sisyphus", "rules", "categories", "quick");
      mkdirSync(sisyphusDir, { recursive: true });
      mkdirSync(agentDir, { recursive: true });
      mkdirSync(categoryDir, { recursive: true });
      writeFileSync(join(sisyphusDir, "root.md"), "root");
      writeFileSync(join(agentDir, "oracle.md"), "oracle");
      writeFileSync(join(categoryDir, "quick.md"), "quick");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then no duplicates
      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
      expect(result.length).toBe(3);
    });
  });

  describe("#given extra configDirs", () => {
    it("should scan and include files from extra configDirs", async () => {
      // given an extra directory with rule files
      const extraDir = join(TEST_DIR, "extra-rules");
      mkdirSync(extraDir, { recursive: true });
      writeFileSync(join(extraDir, "extra.md"), "extra rule");

      // when discovering with that extra dir
      const result = await discoverAgentRuleFiles(TEST_DIR, [extraDir]);

      // then the extra file is included
      expect(result.some((p) => p.endsWith("extra.md"))).toBe(true);
    });

    it("should scan agents and categories subdirs in extra configDirs", async () => {
      // given an extra directory with agents subdirectory
      const extraDir = join(TEST_DIR, "extra-rules");
      const extraAgentDir = join(extraDir, "agents", "metis");
      mkdirSync(extraAgentDir, { recursive: true });
      writeFileSync(join(extraAgentDir, "metis.md"), "metis rules");

      // when discovering with that extra dir
      const result = await discoverAgentRuleFiles(TEST_DIR, [extraDir]);

      // then the agent rule from the extra dir is included
      expect(result.some((p) => p.includes("metis") && p.endsWith("metis.md"))).toBe(true);
    });

    it("should handle multiple extra configDirs", async () => {
      // given two extra directories
      const extraDir1 = join(TEST_DIR, "extra1");
      const extraDir2 = join(TEST_DIR, "extra2");
      mkdirSync(extraDir1, { recursive: true });
      mkdirSync(extraDir2, { recursive: true });
      writeFileSync(join(extraDir1, "one.md"), "one");
      writeFileSync(join(extraDir2, "two.md"), "two");

      // when discovering with both extra dirs
      const result = await discoverAgentRuleFiles(TEST_DIR, [extraDir1, extraDir2]);

      // then files from both extra dirs are included
      expect(result.some((p) => p.endsWith("one.md"))).toBe(true);
      expect(result.some((p) => p.endsWith("two.md"))).toBe(true);
    });
  });

  describe("#given home directory expansion", () => {
    it("should expand ~ in extra configDirs to home directory", async () => {
      // given the actual home directory
      const home = process.env.HOME ?? "";
      const testRulesDir = join(home, ".config", "opencode", "test-discovery-rules");
      mkdirSync(testRulesDir, { recursive: true });
      writeFileSync(join(testRulesDir, "user-rule.md"), "user rule");

      try {
        // when discovering with ~ path
        const result = await discoverAgentRuleFiles(TEST_DIR, ["~/.config/opencode/test-discovery-rules"]);

        // then the file is found via expanded path
        expect(result.some((p) => p.endsWith("user-rule.md"))).toBe(true);
      } finally {
        rmSync(testRulesDir, { recursive: true, force: true });
      }
    });
  });

  describe("#given return value format", () => {
    it("should return absolute paths", async () => {
      // given a rule file
      const rulesDir = join(TEST_DIR, ".sisyphus", "rules");
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, "absolute.md"), "content");

      // when discovering
      const result = await discoverAgentRuleFiles(TEST_DIR, []);

      // then all paths are absolute (start with /)
      for (const p of result) {
        expect(p.startsWith("/")).toBe(true);
      }
    });
  });
});
