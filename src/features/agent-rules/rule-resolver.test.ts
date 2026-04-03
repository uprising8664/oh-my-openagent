import { describe, expect, it } from "bun:test";
import type { AgentRule } from "./types";
import { resolveAgentRules } from "./rule-resolver";

function makeRule(overrides: Partial<AgentRule> & { filePath: string; relativePath: string; content: string; contentHash: string }): AgentRule {
  return {
    metadata: {},
    ...overrides,
  };
}

function globalRule(id: string, content: string): AgentRule {
  return makeRule({
    filePath: `/project/.sisyphus/rules/${id}.md`,
    relativePath: `${id}.md`,
    content,
    contentHash: `hash-${id}`,
    metadata: {},
  });
}

function agentRule(agentName: string, id: string, content: string): AgentRule {
  return makeRule({
    filePath: `/project/.sisyphus/rules/agents/${agentName}/${id}.md`,
    relativePath: `agents/${agentName}/${id}.md`,
    content,
    contentHash: `hash-${id}`,
    metadata: {},
  });
}

function categoryRule(categoryName: string, id: string, content: string): AgentRule {
  return makeRule({
    filePath: `/project/.sisyphus/rules/categories/${categoryName}/${id}.md`,
    relativePath: `categories/${categoryName}/${id}.md`,
    content,
    contentHash: `hash-${id}`,
    metadata: {},
  });
}

describe("resolveAgentRules", () => {
  describe("#given empty rules array", () => {
    describe("#when resolving for any agent", () => {
      it("#then returns empty string", () => {
        const result = resolveAgentRules([], "sisyphus");
        expect(result).toBe("");
      });
    });
  });

  describe("#given global rule with no metadata or scoped path", () => {
    describe("#when resolving for any agent", () => {
      it("#then returns global rule content", () => {
        const rules = [globalRule("use-ripgrep", "Always use ripgrep for searching.")];
        const result = resolveAgentRules(rules, "sisyphus");
        expect(result).toBe("Always use ripgrep for searching.");
      });

      it("#then returns global rule content for different agent", () => {
        const rules = [globalRule("use-ripgrep", "Always use ripgrep for searching.")];
        const result = resolveAgentRules(rules, "oracle");
        expect(result).toBe("Always use ripgrep for searching.");
      });
    });
  });

  describe("#given agent-scoped rule in agents subdirectory", () => {
    describe("#when resolving for the matching agent", () => {
      it("#then returns rule content", () => {
        const rules = [agentRule("sisyphus", "be-careful", "Be careful when editing files.")];
        const result = resolveAgentRules(rules, "sisyphus");
        expect(result).toBe("Be careful when editing files.");
      });
    });

    describe("#when resolving for a different agent", () => {
      it("#then returns empty string", () => {
        const rules = [agentRule("sisyphus", "be-careful", "Be careful when editing files.")];
        const result = resolveAgentRules(rules, "oracle");
        expect(result).toBe("");
      });
    });
  });

  describe("#given category-scoped rule in categories subdirectory", () => {
    describe("#when resolving for matching category", () => {
      it("#then returns rule content", () => {
        const rules = [categoryRule("frontend", "use-tailwind", "Use Tailwind for styling.")];
        const result = resolveAgentRules(rules, "sisyphus", "frontend");
        expect(result).toBe("Use Tailwind for styling.");
      });
    });

    describe("#when resolving without matching category", () => {
      it("#then returns empty string", () => {
        const rules = [categoryRule("frontend", "use-tailwind", "Use Tailwind for styling.")];
        const result = resolveAgentRules(rules, "sisyphus", "backend");
        expect(result).toBe("");
      });

      it("#then returns empty string when no category given", () => {
        const rules = [categoryRule("frontend", "use-tailwind", "Use Tailwind for styling.")];
        const result = resolveAgentRules(rules, "sisyphus");
        expect(result).toBe("");
      });
    });
  });

  describe("#given disabled rule by stem name", () => {
    describe("#when stem matches disabled set entry", () => {
      it("#then excludes rule with matching stem", () => {
        const rules = [globalRule("use-ripgrep", "Always use ripgrep.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, new Set(["use-ripgrep"]));
        expect(result).toBe("");
      });
    });
  });

  describe("#given disabled rule by full relativePath", () => {
    describe("#when full relativePath matches disabled set entry", () => {
      it("#then excludes rule with matching relativePath", () => {
        const rules = [globalRule("use-ripgrep", "Always use ripgrep.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, new Set(["use-ripgrep.md"]));
        expect(result).toBe("");
      });
    });
  });

  describe("#given disabled rule by nested path", () => {
    describe("#when nested relativePath matches disabled set entry", () => {
      it("#then excludes nested rule by stem", () => {
        const rules = [agentRule("sisyphus", "be-careful", "Be careful.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, new Set(["be-careful"]));
        expect(result).toBe("");
      });

      it("#then excludes nested rule by full relativePath", () => {
        const rules = [agentRule("sisyphus", "be-careful", "Be careful.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, new Set(["agents/sisyphus/be-careful.md"]));
        expect(result).toBe("");
      });
    });

    describe("#when disabled set has unrelated entries", () => {
      it("#then rule is still included", () => {
        const rules = [agentRule("sisyphus", "be-careful", "Be careful.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, new Set(["other-rule"]));
        expect(result).toBe("Be careful.");
      });
    });
  });

  describe("#given rules with duplicate content hashes", () => {
    describe("#when two rules have identical contentHash", () => {
      it("#then deduplicates — only first content returned", () => {
        const rule1 = globalRule("rule-a", "Deduplicated content.");
        const rule2 = makeRule({
          filePath: "/project/.sisyphus/rules/rule-b.md",
          relativePath: "rule-b.md",
          content: "Deduplicated content.",
          contentHash: "hash-rule-a",
          metadata: {},
        });
        const result = resolveAgentRules([rule1, rule2], "sisyphus");
        expect(result).toBe("Deduplicated content.");
      });
    });
  });

  describe("#given multiple matching rules with different content", () => {
    describe("#when resolving for agent", () => {
      it("#then concatenates with double newline separator", () => {
        const rule1 = globalRule("rule-a", "Content A.");
        const rule2 = globalRule("rule-b", "Content B.");
        const result = resolveAgentRules([rule1, rule2], "sisyphus");
        expect(result).toBe("Content A.\n\nContent B.");
      });

      it("#then includes global and agent-specific content", () => {
        const global = globalRule("global-rule", "Global content.");
        const agent = agentRule("sisyphus", "agent-rule", "Agent content.");
        const result = resolveAgentRules([global, agent], "sisyphus");
        expect(result).toBe("Global content.\n\nAgent content.");
      });

      it("#then excludes non-matching agent rules", () => {
        const global = globalRule("global-rule", "Global content.");
        const oracle = agentRule("oracle", "oracle-rule", "Oracle content.");
        const result = resolveAgentRules([global, oracle], "sisyphus");
        expect(result).toBe("Global content.");
      });
    });
  });

  describe("#given no disabledRules parameter", () => {
    describe("#when resolving with undefined disabledRules", () => {
      it("#then all matching rules are included", () => {
        const rules = [globalRule("rule-a", "Content A.")];
        const result = resolveAgentRules(rules, "sisyphus", undefined, undefined);
        expect(result).toBe("Content A.");
      });
    });
  });
});
