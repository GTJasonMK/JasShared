import { z } from "zod";
import type { AgentToolSchema } from "./types";
import { agentFailure } from "./commands";

const schemas = new WeakMap<object, z.ZodType>();
export function compileToolInput(schema: Record<string, unknown>): z.ZodType {
  let compiled = schemas.get(schema);
  if (!compiled) {
    compiled = z.fromJSONSchema(schema);
    schemas.set(schema, compiled);
  }
  return compiled;
}

export function validateToolInput(tool: Pick<AgentToolSchema, "inputSchema">, value: unknown) {
  const parsed = compileToolInput(tool.inputSchema).safeParse(value);
  if (!parsed.success) return agentFailure("VALIDATION_FAILED", parsed.error.issues.map((issue) => `${issue.path.join(".") || "$"}: ${issue.message}`).join("\n"));
  return { ok: true as const, data: parsed.data as Record<string, unknown> };
}
