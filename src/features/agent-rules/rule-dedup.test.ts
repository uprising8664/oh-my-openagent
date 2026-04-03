import { describe, expect, it } from "bun:test";
import { deduplicateRules } from "./rule-dedup";
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

describe("deduplicateRules", () => {
  describe("#given an empty array", () => {
    describe("#when called", () => {
      it("#then returns empty array", () => {
        expect(deduplicateRules([])).toEqual([]);
      });
    });
  });

  describe("#given rules with no duplicates", () => {
    describe("#when called", () => {
      it("#then returns all rules unchanged", () => {
        const rules = [
          makeRule({ contentHash: "hash1", filePath: "/rule1.md" }),
          makeRule({ contentHash: "hash2", filePath: "/rule2.md" }),
          makeRule({ contentHash: "hash3", filePath: "/rule3.md" }),
        ];
        const result = deduplicateRules(rules);
        expect(result).toHaveLength(3);
        expect(result[0].contentHash).toBe("hash1");
        expect(result[1].contentHash).toBe("hash2");
        expect(result[2].contentHash).toBe("hash3");
      });
    });
  });

  describe("#given two rules with the same contentHash", () => {
    describe("#when called", () => {
      it("#then only keeps the first occurrence", () => {
        const first = makeRule({ contentHash: "duphash", filePath: "/first.md" });
        const second = makeRule({ contentHash: "duphash", filePath: "/second.md" });
        const result = deduplicateRules([first, second]);
        expect(result).toHaveLength(1);
        expect(result[0].filePath).toBe("/first.md");
      });
    });
  });

  describe("#given three rules where first two share a hash", () => {
    describe("#when called", () => {
      it("#then keeps first and third, drops second", () => {
        const first = makeRule({ contentHash: "duphash", filePath: "/first.md" });
        const second = makeRule({ contentHash: "duphash", filePath: "/second.md" });
        const third = makeRule({ contentHash: "uniquehash", filePath: "/third.md" });
        const result = deduplicateRules([first, second, third]);
        expect(result).toHaveLength(2);
        expect(result[0].filePath).toBe("/first.md");
        expect(result[1].filePath).toBe("/third.md");
      });
    });
  });

  describe("#given rules in a specific order", () => {
    describe("#when called", () => {
      it("#then preserves order of non-duplicate rules", () => {
        const rules = [
          makeRule({ contentHash: "c", filePath: "/c.md" }),
          makeRule({ contentHash: "a", filePath: "/a.md" }),
          makeRule({ contentHash: "b", filePath: "/b.md" }),
        ];
        const result = deduplicateRules(rules);
        expect(result).toHaveLength(3);
        expect(result[0].filePath).toBe("/c.md");
        expect(result[1].filePath).toBe("/a.md");
        expect(result[2].filePath).toBe("/b.md");
      });
    });
  });
});
