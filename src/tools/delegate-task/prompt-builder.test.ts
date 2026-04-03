declare const require: (name: string) => unknown
const { describe, test, expect } = require("bun:test") as {
  describe: (name: string, fn: () => void) => void
  test: (name: string, fn: () => void) => void
  expect: (value: unknown) => {
    toBe: (expected: unknown) => void
    toContain: (expected: string) => void
    toBeDefined: () => void
    toBeUndefined: () => void
    not: {
      toContain: (expected: string) => void
      toBe: (expected: unknown) => void
    }
  }
}

import { buildSystemContent } from "./prompt-builder"

describe("prompt-builder", () => {
  describe("buildSystemContent", () => {
    describe("#given agentRulesContent is provided", () => {
      describe("#when building system content", () => {
        test("#then agentRulesContent appears in output", () => {
          // #given
          const input = {
            agentRulesContent: "Always use rg.",
          }

          // #when
          const result = buildSystemContent(input)

          // #then
          expect(result).toContain("Always use rg.")
        })

        test("#then agentRulesContent appears before skill content", () => {
          // #given
          const input = {
            agentRulesContent: "AGENT_RULES_MARKER",
            skillContent: "SKILL_MARKER",
          }

          // #when
          const result = buildSystemContent(input)

          // #then
          expect(result).toContain("AGENT_RULES_MARKER")
          expect(result).toContain("SKILL_MARKER")
          const rulesPos = (result as string).indexOf("AGENT_RULES_MARKER")
          const skillPos = (result as string).indexOf("SKILL_MARKER")
          expect(rulesPos < skillPos).toBe(true)
        })
      })
    })

    describe("#given agentRulesContent is not provided", () => {
      describe("#when building system content with other fields", () => {
        test("#then output does not crash and returns expected content", () => {
          // #given
          const input = {
            skillContent: "Some skill content",
            categoryPromptAppend: "Category append",
          }

          // #when
          const result = buildSystemContent(input)

          // #then
          expect(result).toContain("Some skill content")
          expect(result).toContain("Category append")
        })

        test("#then output is identical to pre-agentRulesContent behavior", () => {
          // #given
          const inputWithoutRules = {
            skillContent: "skill",
            categoryPromptAppend: "category",
          }
          const inputWithUndefinedRules = {
            skillContent: "skill",
            categoryPromptAppend: "category",
            agentRulesContent: undefined,
          }

          // #when
          const resultWithout = buildSystemContent(inputWithoutRules)
          const resultWithUndefined = buildSystemContent(inputWithUndefinedRules)

          // #then
          expect(resultWithout).toBe(resultWithUndefined)
        })
      })
    })

    describe("#given agentRulesContent with token limit exceeded", () => {
      describe("#when content is very long", () => {
        test("#then agentRulesContent is truncated before agentsContext", () => {
          // #given
          const longRules = "RULES_START:" + "r".repeat(500)
          const longSkill = "SKILL_START:" + "s".repeat(500)
          const agentsContext = "AGENTS_CONTEXT:keep"
          const input = {
            agentRulesContent: longRules,
            skillContent: longSkill,
            agentsContext,
            maxPromptTokens: 30,
          }

          // #when
          const result = buildSystemContent(input)

          // #then
          expect(result).toContain("AGENTS_C")
          expect(result).not.toContain("RULES_START:" + "r".repeat(100))
        })
      })
    })
  })
})
