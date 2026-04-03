import type { PluginContext, PluginInterface, ToolsRecord } from "./plugin/types"
import type { OhMyOpenCodeConfig } from "./config"
import type { AgentRulesContext } from "./features/agent-rules"
import type { ModelCacheState } from "./plugin-state"

import { createChatParamsHandler } from "./plugin/chat-params"
import { createChatHeadersHandler } from "./plugin/chat-headers"
import { createChatMessageHandler } from "./plugin/chat-message"
import { createCommandExecuteBeforeHandler } from "./plugin/command-execute-before"
import { createMessagesTransformHandler } from "./plugin/messages-transform"
import { createSystemTransformHandler } from "./plugin/system-transform"
import { createEventHandler } from "./plugin/event"
import { createToolExecuteAfterHandler } from "./plugin/tool-execute-after"
import { createToolExecuteBeforeHandler } from "./plugin/tool-execute-before"
import { createConfigHandler } from "./plugin-handlers"

import type { CreatedHooks } from "./create-hooks"
import type { Managers } from "./create-managers"

export function createPluginInterface(args: {
  ctx: PluginContext
  pluginConfig: OhMyOpenCodeConfig
  modelCacheState: ModelCacheState
  agentRulesContext: AgentRulesContext
  firstMessageVariantGate: {
    shouldOverride: (sessionID: string) => boolean
    markApplied: (sessionID: string) => void
    markSessionCreated: (sessionInfo: { id?: string; title?: string; parentID?: string } | undefined) => void
    clear: (sessionID: string) => void
  }
  managers: Managers
  hooks: CreatedHooks
  tools: ToolsRecord
}): PluginInterface {
  const { ctx, pluginConfig, modelCacheState, agentRulesContext, firstMessageVariantGate, managers, hooks, tools } =
    args

  const configHandler = createConfigHandler({
    ctx: { directory: ctx.directory, client: ctx.client },
    pluginConfig,
    modelCacheState,
    agentRulesContext,
  })

  return {
    tool: tools,

    "chat.params": async (input: unknown, output: unknown) => {
      const handler = createChatParamsHandler({
        anthropicEffort: hooks.anthropicEffort,
        client: ctx.client,
      })
      await handler(input, output)
    },

    "chat.headers": createChatHeadersHandler({ ctx }),

    "command.execute.before": createCommandExecuteBeforeHandler({
      hooks,
    }),

    "chat.message": createChatMessageHandler({
      ctx,
      pluginConfig,
      firstMessageVariantGate,
      hooks,
    }),

    "experimental.chat.messages.transform": createMessagesTransformHandler({
      hooks,
    }),

    "experimental.chat.system.transform": createSystemTransformHandler(),

    config: configHandler,

    event: createEventHandler({
      ctx,
      pluginConfig,
      firstMessageVariantGate,
      managers,
      hooks,
    }),

    "tool.execute.before": createToolExecuteBeforeHandler({
      ctx,
      hooks,
    }),

    "tool.execute.after": createToolExecuteAfterHandler({
      ctx,
      hooks,
    }),
  }
}
