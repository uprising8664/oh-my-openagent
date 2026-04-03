/// <reference types="bun-types" />

import { describe, test, expect, spyOn } from "bun:test"
import { createBuiltinAgents } from "./builtin-agents"
import type { AgentRulesContext } from "../features/agent-rules"
import * as shared from "../shared"
import * as connectedProvidersCache from "../shared/connected-providers-cache"

const TEST_DEFAULT_MODEL = "anthropic/claude-opus-4-6"

function makeMockContext(rulesContent: string): AgentRulesContext {
  return {
    rules: [],
    disabledRules: new Set(),
    resolveRules: (_agentName: string, _categoryName?: string) => rulesContent,
  }
}

describe("createBuiltinAgents with agentRulesContext", () => {
  describe("#given global rules content", () => {
    describe("#when agentRulesContext is provided", () => {
      test("#then appends rules to all agents instructions", async () => {
        const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
          new Set(["anthropic/claude-opus-4-6"])
        )
        const cacheSpy = spyOn(connectedProvidersCache, "readConnectedProvidersCache").mockReturnValue(null)
        const mockContext = makeMockContext("Always use rg.")

        try {
          const agents = await createBuiltinAgents(
            [],
            {},
            undefined,
            TEST_DEFAULT_MODEL,
            undefined,
            undefined,
            [],
            undefined,
            undefined,
            undefined,
            new Set(),
            false,
            false,
            mockContext,
          )

          const agentNames = Object.keys(agents)
          expect(agentNames.length).toBeGreaterThan(0)

          for (const name of agentNames) {
            expect(agents[name].instructions).toContain("Always use rg.")
          }
        } finally {
          fetchSpy.mockRestore()
          cacheSpy.mockRestore()
        }
      })
    })
  })

  describe("#given no agentRulesContext", () => {
    describe("#when createBuiltinAgents is called without context", () => {
      test("#then completes without error and agents have no injected rules", async () => {
        const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
          new Set(["anthropic/claude-opus-4-6"])
        )
        const cacheSpy = spyOn(connectedProvidersCache, "readConnectedProvidersCache").mockReturnValue(null)

        try {
          const agents = await createBuiltinAgents(
            [],
            {},
            undefined,
            TEST_DEFAULT_MODEL,
          )

          expect(Object.keys(agents).length).toBeGreaterThan(0)
          expect(agents.sisyphus).toBeDefined()
        } finally {
          fetchSpy.mockRestore()
          cacheSpy.mockRestore()
        }
      })
    })
  })

  describe("#given agentRulesContext with agent-specific resolver", () => {
    describe("#when resolveRules returns content only for sisyphus", () => {
      test("#then only sisyphus instructions contain the injected content", async () => {
        const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
          new Set(["anthropic/claude-opus-4-6"])
        )
        const cacheSpy = spyOn(connectedProvidersCache, "readConnectedProvidersCache").mockReturnValue(null)

        const agentSpecificContext: AgentRulesContext = {
          rules: [],
          disabledRules: new Set(),
          resolveRules: (agentName: string, _categoryName?: string) =>
            agentName === "sisyphus" ? "Sisyphus-only rule." : "",
        }

        try {
          const agents = await createBuiltinAgents(
            [],
            {},
            undefined,
            TEST_DEFAULT_MODEL,
            undefined,
            undefined,
            [],
            undefined,
            undefined,
            undefined,
            new Set(),
            false,
            false,
            agentSpecificContext,
          )

          expect(agents.sisyphus).toBeDefined()
          expect(agents.sisyphus.instructions).toContain("Sisyphus-only rule.")

          for (const [name, config] of Object.entries(agents)) {
            if (name !== "sisyphus") {
              expect(config.instructions ?? "").not.toContain("Sisyphus-only rule.")
            }
          }
        } finally {
          fetchSpy.mockRestore()
          cacheSpy.mockRestore()
        }
      })
    })
  })

  describe("#given agentRulesContext and agent with no existing instructions", () => {
    describe("#when resolveRules returns content", () => {
      test("#then instructions is set to rules content directly", async () => {
        const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
          new Set(["anthropic/claude-opus-4-6"])
        )
        const cacheSpy = spyOn(connectedProvidersCache, "readConnectedProvidersCache").mockReturnValue(null)
        const mockContext = makeMockContext("Injected rule.")

        try {
          const agents = await createBuiltinAgents(
            [],
            {},
            undefined,
            TEST_DEFAULT_MODEL,
            undefined,
            undefined,
            [],
            undefined,
            undefined,
            undefined,
            new Set(),
            false,
            false,
            mockContext,
          )

          for (const config of Object.values(agents)) {
            expect(config.instructions).toContain("Injected rule.")
          }
        } finally {
          fetchSpy.mockRestore()
          cacheSpy.mockRestore()
        }
      })
    })
  })
})
