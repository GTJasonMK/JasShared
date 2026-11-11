import type { AgentExecutionTracker } from "./execution";
import type { AgentError, AgentErrorCode, AgentResult } from "./types";
import { fingerprintCommand } from "./hash";
import { agentErrorSchema } from "./schemas";

export function normalizeAgentError(error: unknown, code: AgentErrorCode = "EXTERNAL_FAILURE"): AgentError {
  const parsed = agentErrorSchema.safeParse(error);
  return parsed.success ? parsed.data : { code, message: error instanceof Error ? error.message : String(error), retryable: false };
}

export function agentFailure(code: AgentError["code"], message: string, retryable = false, details?: Record<string, unknown>): AgentResult<never> {
  return { ok: false, error: { code, message, retryable, details } };
}

export function createCommandExecutor(tracker: AgentExecutionTracker, checkpoint: (state: ReturnType<AgentExecutionTracker["getState"]>) => Promise<void>) {
  let queue: Promise<unknown> = Promise.resolve();
  return async function execute<T>(requestId: string, name: string, input: Record<string, unknown>, operation: () => Promise<AgentResult<T>>): Promise<AgentResult<T>> {
    const run = async (): Promise<AgentResult<T>> => {
      const fingerprint = await fingerprintCommand(name, input);
      const existing = tracker.getState().requests.find((item) => item.id === requestId);
      if (existing && existing.fingerprint !== fingerprint) return agentFailure("CONCURRENCY_CONFLICT", "同一请求 ID 不能用于不同操作。", false, { requestId });
      if (existing?.status === "finished" && existing.result) return existing.result as AgentResult<T>;
      if (existing?.status === "archived") return agentFailure("PRECONDITION_FAILED", "请求已执行，详细结果已归档，已阻止重复执行。", false, { requestId });
      if (existing) return agentFailure("OUTCOME_UNKNOWN", "已有执行记录的结果需要核实，已阻止重复执行。", false, { requestId });
      const request = { id: requestId, name, fingerprint, status: "running" as const, createdAt: Date.now() };
      tracker.recordRequest(request);
      try { await checkpoint(tracker.getState()); }
      catch (error) {
        const result = agentFailure("EXTERNAL_FAILURE", `无法保存执行记录，操作未执行：${String(error)}`, true, { requestId });
        tracker.recordRequest({ ...request, status: "finished", result });
        return result;
      }
      let result: AgentResult<T>;
      try { result = await operation(); }
      catch (error) {
        const normalized = normalizeAgentError(error, "OUTCOME_UNKNOWN");
        result = { ok: false, error: { ...normalized, details: { ...normalized.details, requestId } } };
      }
      tracker.recordRequest({ ...request, status: result.error?.code === "OUTCOME_UNKNOWN" ? "unknown" : "finished", result });
      try { await checkpoint(tracker.getState()); }
      catch (error) {
        const partial = agentFailure("PARTIAL_SIDE_EFFECT", `操作已执行，但执行记录未保存：${String(error)}`, false, { requestId, completedEffects: [name] });
        tracker.recordRequest({ ...request, status: "finished", result: partial });
        return partial;
      }
      return result;
    };
    const promise = queue.then(run, run);
    // 每个请求的错误通过其结果返回，队列继续接收下一次独立请求。
    queue = promise;
    return promise;
  };
}
