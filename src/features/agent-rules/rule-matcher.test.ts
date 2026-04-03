import { describe, expect, it } from "bun:test";
import { matchesAgent, matchesAgentOrCategory, matchesCategory } from "./rule-matcher";
import type { AgentRule } from "./types";

function makeRule(overrides: Partial<AgentRule> = {}): AgentRule {
  return {
    filePath: "/project/.sisyphus/rules/my-rule.md",
    relativePath: ".sisyphus/rules/my-rule.md",
    metadata: {},
    content: "rule content",
    contentHash: "abc123",
    ...overrides,
  };
}

describe("matchesAgent", () => {
  describe("#given a rule with metadata.agents", () => {
    describe("#when the agentName is in the list", () => {
      it("#then returns true", () => {
        const rule = makeRule({ metadata: { agents: ["sisyphus", "oracle"] } });
        expect(matchesAgent(rule, "sisyphus")).toBe(true);
      });
    });

    describe("#when the agentName is not in the list", () => {
      it("#then returns false", () => {
        const rule = makeRule({ metadata: { agents: ["oracle"] } });
        expect(matchesAgent(rule, "sisyphus")).toBe(false);
      });
    });
  });

  describe("#given a rule with path-based agent scoping", () => {
    describe("#when filePath contains /agents/{agentName}/", () => {
      it("#then returns true", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/agents/sisyphus/my-rule.md",
          metadata: {},
        });
        expect(matchesAgent(rule, "sisyphus")).toBe(true);
      });
    });

    describe("#when filePath contains a different agent", () => {
      it("#then returns false", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/agents/oracle/my-rule.md",
          metadata: {},
        });
        expect(matchesAgent(rule, "sisyphus")).toBe(false);
      });
    });
  });
});

describe("matchesCategory", () => {
  describe("#given a rule with metadata.categories", () => {
    describe("#when the categoryName is in the list", () => {
      it("#then returns true", () => {
        const rule = makeRule({ metadata: { categories: ["deep", "quick"] } });
        expect(matchesCategory(rule, "deep")).toBe(true);
      });
    });

    describe("#when the categoryName is not in the list", () => {
      it("#then returns false", () => {
        const rule = makeRule({ metadata: { categories: ["quick"] } });
        expect(matchesCategory(rule, "deep")).toBe(false);
      });
    });
  });

  describe("#given a rule with path-based category scoping", () => {
    describe("#when filePath contains /categories/{categoryName}/", () => {
      it("#then returns true", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/categories/deep/my-rule.md",
          metadata: {},
        });
        expect(matchesCategory(rule, "deep")).toBe(true);
      });
    });

    describe("#when filePath contains a different category", () => {
      it("#then returns false", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/categories/quick/my-rule.md",
          metadata: {},
        });
        expect(matchesCategory(rule, "deep")).toBe(false);
      });
    });
  });
});

describe("matchesAgentOrCategory", () => {
  describe("#given a global rule with no metadata and not in scoped subdir", () => {
    describe("#when called with any agentName", () => {
      it("#then matches all agents", () => {
        const rule = makeRule({ metadata: {} });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(true);
        expect(matchesAgentOrCategory(rule, "oracle")).toBe(true);
        expect(matchesAgentOrCategory(rule, "hephaestus")).toBe(true);
      });

      it("#then matches all agents with any category", () => {
        const rule = makeRule({ metadata: {} });
        expect(matchesAgentOrCategory(rule, "sisyphus", "deep")).toBe(true);
        expect(matchesAgentOrCategory(rule, "oracle", "quick")).toBe(true);
      });
    });
  });

  describe("#given a rule with scope: global", () => {
    describe("#when called with any agentName", () => {
      it("#then matches all agents", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/agents/sisyphus/my-rule.md",
          metadata: { scope: "global" },
        });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(true);
        expect(matchesAgentOrCategory(rule, "oracle")).toBe(true);
      });
    });
  });

  describe("#given a rule with metadata.agents", () => {
    describe("#when agentName matches", () => {
      it("#then returns true", () => {
        const rule = makeRule({ metadata: { agents: ["sisyphus"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(true);
      });
    });

    describe("#when agentName does not match", () => {
      it("#then returns false", () => {
        const rule = makeRule({ metadata: { agents: ["oracle"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(false);
      });
    });
  });

  describe("#given a rule with metadata.categories", () => {
    describe("#when categoryName matches", () => {
      it("#then returns true", () => {
        const rule = makeRule({ metadata: { categories: ["deep"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus", "deep")).toBe(true);
      });
    });

    describe("#when categoryName does not match", () => {
      it("#then returns false", () => {
        const rule = makeRule({ metadata: { categories: ["quick"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus", "deep")).toBe(false);
      });
    });

    describe("#when no categoryName provided", () => {
      it("#then returns false", () => {
        const rule = makeRule({ metadata: { categories: ["deep"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(false);
      });
    });
  });

  describe("#given a rule with both agents and categories (OR semantics)", () => {
    const rule = makeRule({ metadata: { agents: ["sisyphus"], categories: ["deep"] } });

    describe("#when agent matches but category does not", () => {
      it("#then returns true", () => {
        expect(matchesAgentOrCategory(rule, "sisyphus", "quick")).toBe(true);
      });
    });

    describe("#when category matches but agent does not", () => {
      it("#then returns true", () => {
        expect(matchesAgentOrCategory(rule, "oracle", "deep")).toBe(true);
      });
    });

    describe("#when neither agent nor category matches", () => {
      it("#then returns false", () => {
        expect(matchesAgentOrCategory(rule, "oracle", "quick")).toBe(false);
      });
    });
  });

  describe("#given a path-based agent scoped rule", () => {
    describe("#when filePath contains /agents/sisyphus/", () => {
      it("#then matches sisyphus but not oracle", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/agents/sisyphus/my-rule.md",
          metadata: {},
        });
        expect(matchesAgentOrCategory(rule, "sisyphus")).toBe(true);
        expect(matchesAgentOrCategory(rule, "oracle")).toBe(false);
      });
    });

    describe("#when rule has no metadata but is in agents/ subdir", () => {
      it("#then is NOT treated as global", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/agents/sisyphus/my-rule.md",
          metadata: {},
        });
        expect(matchesAgentOrCategory(rule, "oracle")).toBe(false);
      });
    });
  });

  describe("#given a path-based category scoped rule", () => {
    describe("#when filePath contains /categories/deep/", () => {
      it("#then matches deep category but not quick", () => {
        const rule = makeRule({
          filePath: "/project/.sisyphus/rules/categories/deep/my-rule.md",
          metadata: {},
        });
        expect(matchesAgentOrCategory(rule, "sisyphus", "deep")).toBe(true);
        expect(matchesAgentOrCategory(rule, "sisyphus", "quick")).toBe(false);
      });
    });
  });

  describe("#given edge cases", () => {
    describe("#when agentName is empty string", () => {
      it("#then global rule still matches", () => {
        const rule = makeRule({ metadata: {} });
        expect(matchesAgentOrCategory(rule, "")).toBe(true);
      });
    });

    describe("#when categoryName is empty string", () => {
      it("#then category-scoped rule does not match", () => {
        const rule = makeRule({ metadata: { categories: ["deep"] } });
        expect(matchesAgentOrCategory(rule, "sisyphus", "")).toBe(false);
      });
    });
  });
});
