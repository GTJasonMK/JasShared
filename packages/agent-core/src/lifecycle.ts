import type { AgentExecutionTracker } from "./execution";
import type { AgentActor, AgentError } from "./types";

export function finishTrackedAction(tracker: AgentExecutionTracker, args: {
  sessionId: string; taskId?: string; actor: AgentActor; actorId?: string; resourceId: string;
  eventType: string; message: string; outputSummary?: string; error?: AgentError; timestamp: number;
}) {
  const session = tracker.getSession(args.sessionId);
  if (!session) throw new Error("执行会话不存在。");
  if (!["taken_over", "aborted", "finished"].includes(session.status)) tracker.updateSession(session.id, {
    status: args.error ? "aborted" : "finished", currentStep: args.error ? "failed" : "completed", endedAt: args.timestamp, lastError: args.error,
  });
  if (args.taskId && !["succeeded", "failed", "cancelled"].includes(tracker.getTask(args.taskId)?.status ?? "")) tracker.updateTask(args.taskId, {
    status: args.error ? "failed" : "succeeded", message: args.message, progressPercent: 100, completedAt: args.timestamp, outputSummary: args.outputSummary, error: args.error,
  });
  return tracker.appendEvent({
    type: args.eventType, timestamp: args.timestamp, sessionId: args.sessionId, taskId: args.taskId,
    resourceId: args.resourceId, actor: args.actor, actorId: args.actorId,
    level: args.error ? "error" : "info", message: args.message, data: args.error?.details,
  });
}

export function takeOverTrackedSession(tracker: AgentExecutionTracker, args: { sessionId: string; actor: AgentActor; actorId?: string; reason: string; timestamp: number }) {
  const session = tracker.getSession(args.sessionId);
  if (!session || ["finished", "aborted", "taken_over"].includes(session.status)) throw new Error("当前会话不能接管。");
  for (const approval of tracker.getState().approvals.filter((item) => item.sessionId === session.id && item.status === "requested")) {
    tracker.updateApproval(approval.id, { status: "expired", resolvedBy: args.actor, resolvedById: args.actorId, resolutionReason: args.reason });
  }
  tracker.updateSession(session.id, { status: "taken_over", currentStep: "human_takeover", endedAt: args.timestamp });
  if (session.taskId) tracker.updateTask(session.taskId, { status: "cancelled", message: args.reason, completedAt: args.timestamp });
  return tracker.appendEvent({ type: "agent.session.taken_over", level: "warning", message: args.reason, timestamp: args.timestamp, sessionId: session.id, taskId: session.taskId, resourceId: session.resourceId, actor: args.actor, actorId: args.actorId });
}
