import { z } from "zod";
import type { AgentApprovalRecord, AgentEventRecord, AgentExecutionState, AgentSessionRecord, AgentTaskRecord } from "./types";

export interface AgentExecutionTracker {
  beginSession(input: Omit<AgentSessionRecord, "id" | "createdAt" | "updatedAt">): AgentSessionRecord;
  updateSession(id: string, patch: Partial<Omit<AgentSessionRecord, "id" | "createdAt">>): AgentSessionRecord | null;
  getSession(id: string): AgentSessionRecord | null;
  createTask(input: Omit<AgentTaskRecord, "id" | "createdAt" | "updatedAt">): AgentTaskRecord;
  updateTask(id: string, patch: Partial<Omit<AgentTaskRecord, "id" | "sessionId" | "createdAt">>): AgentTaskRecord | null;
  getTask(id: string): AgentTaskRecord | null;
  createApproval(input: Omit<AgentApprovalRecord, "id" | "createdAt" | "updatedAt">): AgentApprovalRecord;
  updateApproval(id: string, patch: Partial<Omit<AgentApprovalRecord, "id" | "sessionId" | "taskId" | "createdAt">>): AgentApprovalRecord | null;
  getApproval(id: string): AgentApprovalRecord | null;
  appendEvent(input: Omit<AgentEventRecord, "id">): AgentEventRecord;
  getState(): AgentExecutionState;
  replaceState(state: AgentExecutionState): void;
  subscribe(listener: (state: AgentExecutionState) => void): () => void;
  recordRequest(request: AgentExecutionState["requests"][number]): void;
}

const base = { id: z.string(), createdAt: z.number(), updatedAt: z.number() };
const errorSchema = z.object({ code: z.enum(["VALIDATION_FAILED", "INVALID_INPUT", "PRECONDITION_FAILED", "RESOURCE_NOT_FOUND", "CONCURRENCY_CONFLICT", "EXTERNAL_FAILURE", "APPROVAL_REQUIRED", "APP_UNAVAILABLE", "PARTIAL_SIDE_EFFECT", "OUTCOME_UNKNOWN"]), message: z.string(), retryable: z.boolean(), details: z.record(z.string(), z.unknown()).optional() });
const resultSchema = z.object({ ok: z.boolean(), error: errorSchema.optional() }).passthrough().refine((value) => value.ok || value.error !== undefined, "失败结果缺少错误详情");
const snapshotSchema = z.object({
  protocolVersion: z.literal(1), latestSessionId: z.string().nullable(),
  sessions: z.array(z.object({ ...base, status: z.enum(["planned", "active", "paused", "finished", "taken_over", "aborted"]), goal: z.string(), resourceId: z.string(), actor: z.enum(["human", "agent", "supervisor", "system"]), currentAction: z.string(), currentStep: z.string() }).passthrough()),
  tasks: z.array(z.object({ ...base, sessionId: z.string(), actionName: z.string(), resourceId: z.string(), status: z.enum(["pending", "running", "blocked", "succeeded", "failed", "cancelled"]), title: z.string(), message: z.string(), progressPercent: z.number() }).passthrough()),
  approvals: z.array(z.object({ ...base, sessionId: z.string(), taskId: z.string(), actionName: z.string(), resourceId: z.string(), status: z.enum(["requested", "approved", "rejected", "expired"]), title: z.string(), riskSummary: z.string(), inputSummary: z.string(), createdBy: z.enum(["human", "agent", "supervisor", "system"]) }).passthrough()),
  events: z.array(z.object({ id: z.string(), timestamp: z.number(), type: z.string(), level: z.enum(["info", "warning", "error"]), message: z.string() }).passthrough()),
  requests: z.array(z.object({ id: z.string(), name: z.string(), fingerprint: z.string(), status: z.enum(["running", "finished", "unknown", "archived"]), createdAt: z.number(), result: resultSchema.optional() }).refine((value) => value.status !== "finished" || value.result !== undefined, "已结束请求缺少结果")),
});

export function parseExecutionState(value: unknown): AgentExecutionState {
  return snapshotSchema.parse(value) as AgentExecutionState;
}
export function emptyExecutionState(): AgentExecutionState {
  return { protocolVersion: 1, latestSessionId: null, sessions: [], tasks: [], approvals: [], events: [], requests: [] };
}

export function recoverExecutionState(value: AgentExecutionState): AgentExecutionState {
  const state = parseExecutionState(value);
  const error: import("./types").AgentError = { code: "OUTCOME_UNKNOWN", message: "上次执行被中断，请核实已产生的结果。", retryable: false };
  state.requests = state.requests.map((request) => request.status === "running" ? { ...request, status: "unknown" } : request);
  const interrupted = new Set(state.sessions.filter((session) => session.status === "active" || session.status === "planned").map((session) => session.id));
  state.sessions = state.sessions.map((session) => interrupted.has(session.id) ? { ...session, status: "aborted", currentStep: "interrupted", lastError: error } : session);
  state.tasks = state.tasks.map((task) => interrupted.has(task.sessionId) && ["running", "pending"].includes(task.status) ? { ...task, status: "failed", message: error.message, error } : task);
  return state;
}

const sessionTransitions: Record<AgentSessionRecord["status"], AgentSessionRecord["status"][]> = {
  planned: ["active", "aborted", "taken_over"], active: ["paused", "finished", "taken_over", "aborted"],
  paused: ["active", "finished", "taken_over", "aborted"], finished: [], taken_over: [], aborted: [],
};

export function createExecutionTracker(options: { now?: () => number; initial?: AgentExecutionState; createId?: (prefix: string) => string } = {}): AgentExecutionTracker {
  const now = options.now ?? Date.now;
  let state = options.initial ? recoverExecutionState(options.initial) : emptyExecutionState();
  let counter = 0;
  const listeners = new Set<(state: AgentExecutionState) => void>();
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const id = (prefix: string) => options.createId?.(prefix) ?? `${prefix}_${now().toString(36)}_${(++counter).toString(36)}`;
  const snapshot = () => clone(state);
  const notify = () => { for (const listener of listeners) listener(snapshot()); };
  const update = <T extends { id: string; updatedAt?: number }>(items: T[], recordId: string, patch: Partial<T>) => {
    const index = items.findIndex((item) => item.id === recordId);
    if (index < 0) return null;
    items[index] = { ...items[index], ...patch, updatedAt: now() };
    notify();
    return clone(items[index]);
  };
  const retain = <T,>(items: T[], limit: number, active: (item: T) => boolean): T[] => {
    const history = items.filter((item) => !active(item)).slice(-limit);
    return items.filter(active).concat(history);
  };
  for (const request of state.requests) if (request.status === "running") request.status = "unknown";

  return {
    beginSession(input) {
      const record = { ...input, actorId: input.actorId ?? input.actor, id: id("session"), createdAt: now(), updatedAt: now() };
      state.sessions = retain([...state.sessions, record], 10, (item) => ["active", "paused", "planned"].includes(item.status));
      state.latestSessionId = record.id;
      notify(); return clone(record);
    },
    updateSession(recordId, patch) {
      const current = state.sessions.find((item) => item.id === recordId);
      if (current && patch.status && patch.status !== current.status && !sessionTransitions[current.status].includes(patch.status)) throw new Error(`非法会话状态变更：${current.status} -> ${patch.status}`);
      if (current) state.latestSessionId = recordId;
      return update<AgentSessionRecord>(state.sessions, recordId, patch);
    },
    getSession: (recordId) => clone(state.sessions.find((item) => item.id === recordId) ?? null),
    createTask(input) {
      const record = { ...input, id: id("task"), createdAt: now(), updatedAt: now() };
      state.tasks = retain([...state.tasks, record], 12, (item) => ["pending", "running", "blocked"].includes(item.status));
      notify(); return clone(record);
    },
    updateTask: (recordId, patch) => update<AgentTaskRecord>(state.tasks, recordId, patch),
    getTask: (recordId) => clone(state.tasks.find((item) => item.id === recordId) ?? null),
    createApproval(input) {
      const record = { ...input, createdById: input.createdById ?? input.createdBy, id: id("approval"), createdAt: now(), updatedAt: now() };
      state.approvals = retain([...state.approvals, record], 12, (item) => item.status === "requested");
      notify(); return clone(record);
    },
    updateApproval(recordId, patch) {
      const current = state.approvals.find((item) => item.id === recordId);
      if (current && patch.status && patch.status !== current.status && current.status !== "requested") throw new Error("审批已经结束，不能再次执行。");
      return update<AgentApprovalRecord>(state.approvals, recordId, patch);
    },
    getApproval: (recordId) => clone(state.approvals.find((item) => item.id === recordId) ?? null),
    appendEvent(input) {
      const event = { ...input, actorId: input.actorId ?? input.actor, id: id("event") };
      state.events = [...state.events, event].slice(-60);
      notify(); return clone(event);
    },
    getState: snapshot,
    replaceState(next) { state = clone(parseExecutionState(next)); notify(); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    recordRequest(request) {
      const requests = [...state.requests.filter((item) => item.id !== request.id), clone(request)];
      let archive = Math.max(0, requests.filter((item) => item.status === "finished").length - 100);
      // 保留请求身份，归档旧结果时仍禁止重放。
      state.requests = requests.map((item) => item.status === "finished" && archive-- > 0 ? { ...item, status: "archived", result: undefined } : item);
      notify();
    },
  };
}

export function createInMemoryExecutionTracker(now: () => number = Date.now): AgentExecutionTracker {
  return createExecutionTracker({ now });
}
