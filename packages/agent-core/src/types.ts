import type { z } from "zod";
import type { agentApprovalSchema, agentErrorSchema, agentEventSchema, agentRequestSchema, agentResultSchema, agentSessionSchema, agentTaskSchema, executionStateSchema } from "./schemas";
export const AGENT_PROTOCOL_VERSION = 1;
export type AgentActor = AgentSessionRecord["actor"];
export type AgentSessionStatus = AgentSessionRecord["status"];
export type AgentTaskStatus = AgentTaskRecord["status"];
export type AgentApprovalStatus = AgentApprovalRecord["status"];
export type AgentEventLevel = AgentEventRecord["level"];
export const AGENT_ERROR_CODES = ["VALIDATION_FAILED", "INVALID_INPUT", "PRECONDITION_FAILED", "RESOURCE_NOT_FOUND", "CONCURRENCY_CONFLICT", "EXTERNAL_FAILURE", "APPROVAL_REQUIRED", "APP_UNAVAILABLE", "PARTIAL_SIDE_EFFECT", "OUTCOME_UNKNOWN"] as const;
export type AgentErrorCode = (typeof AGENT_ERROR_CODES)[number];
export type AgentError = z.infer<typeof agentErrorSchema>;
export type AgentEventRecord = z.infer<typeof agentEventSchema>;
export type AgentTaskRecord = z.infer<typeof agentTaskSchema>;
export type AgentApprovalRecord = z.infer<typeof agentApprovalSchema>;
export type AgentSessionRecord = z.infer<typeof agentSessionSchema>;
export type AgentResult<T = unknown> = Omit<z.infer<typeof agentResultSchema>, "data"> & { data?: T };
export type AgentRequestRecord = z.infer<typeof agentRequestSchema>;
export type AgentExecutionState = z.infer<typeof executionStateSchema>;
export interface AgentToolSchema {
  name: string; kind: "query" | "action" | "approval" | "task"; goal: string; description: string;
  inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown>;
  preconditions: string[]; sideEffects: string[];
  idempotency: "idempotent" | "conditionally_idempotent" | "not_idempotent";
  confirmationRequirement: "none" | "human_confirmation_required" | "human_approval_required";
  failureModes: AgentErrorCode[]; observableEvents: string[]; visibility: "safe_by_default" | "guarded";
}
