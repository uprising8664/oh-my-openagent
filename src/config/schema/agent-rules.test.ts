import { describe, expect, test } from "bun:test"
import { ZodError } from "zod"
import { mergeConfigs } from "../../plugin-config"
import type { OhMyOpenCodeConfig } from "./oh-my-opencode-config"
import { AgentRulesConfigSchema } from "./agent-rules"

describe("AgentRulesConfigSchema", () => {
  describe("#given valid agent rules", () => {
    test("#when parsed #then returns dirs and disabled", () => {
      const result = AgentRulesConfigSchema.parse({
        dirs: ["src/agents"],
        disabled: ["oracle"],
      })

      expect(result).toEqual({
        dirs: ["src/agents"],
        disabled: ["oracle"],
      })
    })
  })

  describe("#given disabled is not an array", () => {
    test("#when parsed #then throws ZodError", () => {
      let thrownError: unknown

      try {
        AgentRulesConfigSchema.parse({ disabled: "oracle" })
      } catch (error) {
        thrownError = error
      }

      expect(thrownError).toBeInstanceOf(ZodError)
    })
  })
})

describe("mergeConfigs agent_rules", () => {
  describe("#given base and override agent rules", () => {
    test("#when merged #then dirs are replaced and disabled is unioned", () => {
      const base: OhMyOpenCodeConfig = {
        agent_rules: {
          dirs: ["base/rules"],
          disabled: ["oracle", "momus"],
        },
      }

      const override: OhMyOpenCodeConfig = {
        agent_rules: {
          dirs: ["project/rules"],
          disabled: ["momus", "explore"],
        },
      }

      const result = mergeConfigs(base, override)

      expect(result.agent_rules?.dirs).toEqual(["project/rules"])
      expect(result.agent_rules?.disabled).toEqual(["oracle", "momus", "explore"])
    })
  })

  describe("#given only base agent rules", () => {
    test("#when merged #then base values are preserved", () => {
      const base: OhMyOpenCodeConfig = {
        agent_rules: {
          dirs: ["base/rules"],
          disabled: ["oracle"],
        },
      }

      const result = mergeConfigs(base, {})

      expect(result.agent_rules?.dirs).toEqual(["base/rules"])
      expect(result.agent_rules?.disabled).toEqual(["oracle"])
    })
  })
})
