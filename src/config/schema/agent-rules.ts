import { z } from "zod"

export const AgentRulesConfigSchema = z.object({
  dirs: z.array(z.string()).optional().default([]),
  disabled: z.array(z.string()).optional().default([]),
})

export type AgentRulesConfig = z.infer<typeof AgentRulesConfigSchema>
