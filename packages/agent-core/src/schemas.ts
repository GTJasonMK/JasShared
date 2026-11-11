import { z } from "zod";
import { AGENT_PROTOCOL_VERSION, AGENT_ERROR_CODES } from "./types";

const id = z.string().min(1);
const timestamp = z.number().int().nonnegative();
const actor = z.enum(["human", "agent", "supervisor", "system"]);
const data = z.record(z.string(), z.unknown());
const base = { id, createdAt: timestamp, updatedAt: timestamp };
export const agentErrorSchema = z.object({ code: z.enum(AGENT_ERROR_CODES), message: z.string(), retryable: z.boolean(), details: data.optional() });
export const agentEventSchema = z.object({
  id, type: id, level: z.enum(["info", "warning", "error"]), message: z.string(), timestamp,
  sessionId: id.optional(), taskId: id.optional(), approvalId: id.optional(), resourceId: id.optional(),
  actor: actor.optional(), actorId: id.optional(), data: data.optional(),
});
export const agentTaskSchema = z.object({
  ...base, sessionId: id, actionName: id, resourceId: id,
  status: z.enum(["pending", "running", "blocked", "succeeded", "failed", "cancelled"]),
  title: z.string(), message: z.string(), progressPercent: z.number().min(0).max(100),
  completedAt: timestamp.optional(), inputSummary: z.string().optional(), outputSummary: z.string().optional(), error: agentErrorSchema.optional(),
});
export const agentApprovalSchema = z.object({
  ...base, sessionId: id, taskId: id, actionName: id, resourceId: id,
  status: z.enum(["requested", "approved", "rejected", "expired"]), title: z.string(), riskSummary: z.string(), inputSummary: z.string(),
  createdBy: actor, createdById: id.optional(), resolvedBy: actor.optional(), resolvedById: id.optional(), resolutionReason: z.string().optional(), payload: data.optional(),
});
export const agentSessionSchema = z.object({
  ...base, goal: z.string(), resourceId: id, actor, actorId: id.optional(),
  status: z.enum(["planned", "active", "paused", "finished", "taken_over", "aborted"]),
  currentAction: id, currentStep: z.string(), endedAt: timestamp.optional(), taskId: id.optional(), approvalId: id.optional(), lastError: agentErrorSchema.optional(),
});
export const agentResultSchema = z.object({
  ok: z.boolean(), data: z.unknown().optional(), task: agentTaskSchema.nullable().optional(), approval: agentApprovalSchema.nullable().optional(), events: z.array(agentEventSchema).optional(), error: agentErrorSchema.optional(),
}).refine((result) => result.ok ? !result.error : Boolean(result.error), "执行结果与错误状态不一致。");
export const agentRequestSchema = z.object({
  id, name: id, fingerprint: z.string().regex(/^[a-f0-9]{64}$/), status: z.enum(["running", "finished", "unknown", "archived"]), createdAt: timestamp, result: agentResultSchema.optional(),
}).refine((request) => request.status !== "finished" || Boolean(request.result), "已结束请求缺少结果。");
export const executionStateSchema = z.object({
  protocolVersion: z.literal(AGENT_PROTOCOL_VERSION), latestSessionId: id.nullable(),
  sessions: z.array(agentSessionSchema), tasks: z.array(agentTaskSchema), approvals: z.array(agentApprovalSchema), events: z.array(agentEventSchema), requests: z.array(agentRequestSchema),
}).superRefine((state, context) => {
  for (const name of ["sessions", "tasks", "approvals", "events", "requests"] as const) {
    const seen = new Set<string>();
    state[name].forEach((record, index) => {
      if (seen.has(record.id)) context.addIssue({ code: "custom", path: [name, index, "id"], message: "执行记录 ID 重复。" });
      seen.add(record.id);
    });
  }
  const sessions = new Map(state.sessions.map((session) => [session.id, session]));
  const tasks = new Map(state.tasks.map((task) => [task.id, task]));
  if (state.latestSessionId && !sessions.has(state.latestSessionId)) context.addIssue({ code: "custom", path: ["latestSessionId"], message: "最近会话不存在。" });
  state.approvals.forEach((approval, index) => {
    if (approval.status !== "requested") return;
    const session = sessions.get(approval.sessionId);
    const task = tasks.get(approval.taskId);
    if (!session || !task || task.sessionId !== session.id || ["finished", "aborted", "taken_over"].includes(session.status)) context.addIssue({ code: "custom", path: ["approvals", index], message: "待审批记录缺少可执行的会话或任务。" });
  });
});
