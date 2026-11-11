export const AGENT_PROTOCOL_VERSION = 1;
export type AgentActor = "human" | "agent" | "supervisor" | "system";
export type AgentSessionStatus = "planned" | "active" | "paused" | "finished" | "taken_over" | "aborted";
export type AgentTaskStatus = "pending" | "running" | "blocked" | "succeeded" | "failed" | "cancelled";
export type AgentApprovalStatus = "requested" | "approved" | "rejected" | "expired";
export type AgentEventLevel = "info" | "warning" | "error";
export type AgentErrorCode = "VALIDATION_FAILED" | "INVALID_INPUT" | "PRECONDITION_FAILED" | "RESOURCE_NOT_FOUND" | "CONCURRENCY_CONFLICT" | "EXTERNAL_FAILURE" | "APPROVAL_REQUIRED" | "APP_UNAVAILABLE" | "PARTIAL_SIDE_EFFECT" | "OUTCOME_UNKNOWN";
export interface AgentError { code: AgentErrorCode; message: string; retryable: boolean; details?: Record<string, unknown> }
export interface AgentEventRecord {
  id: string; type: string; level: AgentEventLevel; message: string; timestamp: number;
  sessionId?: string; taskId?: string; approvalId?: string; resourceId?: string;
  actor?: AgentActor; actorId?: string; data?: Record<string, unknown>;
}
export interface AgentTaskRecord {
  id: string; sessionId: string; actionName: string; resourceId: string; status: AgentTaskStatus;
  title: string; message: string; progressPercent: number; createdAt: number; updatedAt: number;
  completedAt?: number; inputSummary?: string; outputSummary?: string; error?: AgentError;
}
export interface AgentApprovalRecord {
  id: string; sessionId: string; taskId: string; actionName: string; resourceId: string; status: AgentApprovalStatus;
  title: string; riskSummary: string; inputSummary: string; createdBy: AgentActor; createdById?: string;
  createdAt: number; updatedAt: number; resolvedBy?: AgentActor; resolvedById?: string; resolutionReason?: string;
  payload?: Record<string, unknown>;
}
export interface AgentSessionRecord {
  id: string; goal: string; resourceId: string; actor: AgentActor; actorId?: string; status: AgentSessionStatus;
  currentAction: string; currentStep: string; createdAt: number; updatedAt: number; endedAt?: number;
  taskId?: string; approvalId?: string; lastError?: AgentError;
}
export interface AgentResult<T = unknown> {
  ok: boolean; data?: T; task?: AgentTaskRecord | null; approval?: AgentApprovalRecord | null;
  events?: AgentEventRecord[]; error?: AgentError;
}
export interface AgentRequestRecord {
  id: string; name: string; fingerprint: string; status: "running" | "finished" | "unknown" | "archived";
  createdAt: number; result?: AgentResult;
}
export interface AgentExecutionState {
  protocolVersion: 1; latestSessionId: string | null;
  sessions: AgentSessionRecord[]; tasks: AgentTaskRecord[]; approvals: AgentApprovalRecord[];
  events: AgentEventRecord[]; requests: AgentRequestRecord[];
}
export interface AgentToolSchema {
  name: string; kind: "query" | "action" | "approval" | "task"; goal: string; description: string;
  inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown>;
  preconditions: string[]; sideEffects: string[];
  idempotency: "idempotent" | "conditionally_idempotent" | "not_idempotent";
  confirmationRequirement: "none" | "human_confirmation_required" | "human_approval_required";
  failureModes: AgentErrorCode[]; observableEvents: string[]; visibility: "safe_by_default" | "guarded";
}
