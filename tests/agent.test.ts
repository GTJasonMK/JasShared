import assert from "node:assert/strict";
import test from "node:test";
import { createCommandExecutor, createExecutionTracker, fingerprintCommand, hashText, parseExecutionState, validateToolInput } from "../packages/agent-core/src/index";

test("concurrent copies of a command execute once and results survive restoration", async () => {
  const tracker = createExecutionTracker();
  const snapshots: unknown[] = [];
  const execute = createCommandExecutor(tracker, async (state) => { snapshots.push(state); });
  let count = 0;
  const operation = async () => { count++; return { ok: true, data: { retained: true } }; };
  const results = await Promise.all([execute("id", "save", {}, operation), execute("id", "save", {}, operation)]);
  assert.equal(count, 1);
  assert.deepEqual(results[0], results[1]);
  const restored = createExecutionTracker({ initial: tracker.getState() });
  await createCommandExecutor(restored, async () => {})("id", "save", {}, operation);
  assert.equal(count, 1);
  assert.equal(snapshots.length, 2);
});

test("checkpoint failure prevents side effects", async () => {
  const tracker = createExecutionTracker();
  let count = 0;
  const result = await createCommandExecutor(tracker, async () => { throw new Error("disk full"); })("id", "save", {}, async () => { count++; return { ok: true }; });
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, "EXTERNAL_FAILURE");
  assert.equal(count, 0);
});

test("unfinished restored commands are never automatically replayed", async () => {
  const tracker = createExecutionTracker();
  tracker.recordRequest({ id: "id", name: "delete", fingerprint: await fingerprintCommand("delete", {}), status: "running", createdAt: 1 });
  const restored = createExecutionTracker({ initial: tracker.getState() });
  let count = 0;
  const result = await createCommandExecutor(restored, async () => {})("id", "delete", {}, async () => { count++; return { ok: true }; });
  assert.equal(result.error?.code, "OUTCOME_UNKNOWN");
  assert.equal(count, 0);
});

test("mutable UI projections cannot modify the execution state", () => {
  const tracker = createExecutionTracker();
  const snapshot = tracker.getState();
  snapshot.events.push({ id: "forged", type: "forged", timestamp: 1, level: "info", message: "forged" });
  assert.equal(tracker.getState().events.length, 0);
});

test("tool validation uses the advertised schema and rejects malformed inputs", () => {
  const tool = { inputSchema: { type: "object", properties: { id: { type: "string", minLength: 1 } }, required: ["id"], additionalProperties: false } };
  assert.equal(validateToolInput(tool, { id: "node" }).ok, true);
  assert.equal(validateToolInput(tool, { id: 42 }).ok, false);
  assert.equal(validateToolInput(tool, { id: "node", injected: true }).ok, false);
});

test("command fingerprints are bounded and independent of object key order", async () => {
  const first = await fingerprintCommand("save", { b: 2, a: { d: 4, c: 3 } });
  assert.equal(first.length, 64);
  assert.equal(first, await fingerprintCommand("save", { a: { c: 3, d: 4 }, b: 2 }));
});

test("same request ID rejects a different input and post-effect checkpoint failure stays explicit", async () => {
  const tracker = createExecutionTracker();
  let checkpoints = 0;
  let effects = 0;
  const execute = createCommandExecutor(tracker, async () => { if (++checkpoints > 1) throw new Error("disk full"); });
  const operation = async () => { effects++; return { ok: true }; };
  const result = await execute("one", "write", { value: 1 }, operation);
  assert.equal(result.error?.code, "PARTIAL_SIDE_EFFECT");
  assert.equal((await execute("one", "write", { value: 1 }, operation)).error?.code, "PARTIAL_SIDE_EFFECT");
  assert.equal((await execute("one", "write", { value: 2 }, operation)).error?.code, "CONCURRENCY_CONFLICT");
  assert.equal(effects, 1);
});

test("restoration exposes interrupted tasks and rejects malformed cached results", () => {
  const tracker = createExecutionTracker();
  const session = tracker.beginSession({ actor: "agent", goal: "save", resourceId: "doc", status: "active", currentAction: "save", currentStep: "write" });
  tracker.createTask({ sessionId: session.id, actionName: "save", resourceId: "doc", status: "running", title: "save", message: "write", progressPercent: 10 });
  const restored = createExecutionTracker({ initial: tracker.getState() }).getState();
  assert.equal(restored.sessions[0].status, "aborted");
  assert.equal(restored.tasks[0].error?.code, "OUTCOME_UNKNOWN");
  assert.throws(() => parseExecutionState({ ...restored, requests: [{ id: "bad", name: "save", fingerprint: "hash", status: "finished", createdAt: 1, result: { ok: "yes" } }] }));
});

test("archiving old results retains request identities and never replays old side effects", async () => {
  const tracker = createExecutionTracker();
  const execute = createCommandExecutor(tracker, async () => {});
  let effects = 0;
  const operation = async () => { effects++; return { ok: true }; };
  for (let index = 0; index < 105; index++) await execute(`request-${index}`, "save", {}, operation);
  const state = tracker.getState();
  assert.equal(state.requests.length, 105);
  assert.equal(state.requests.find((request) => request.id === 'request-0')?.status, 'archived');
  const restored = createCommandExecutor(createExecutionTracker({ initial: state }), async () => {});
  assert.equal((await restored('request-0', 'save', {}, operation)).error?.code, 'PRECONDITION_FAILED');
  assert.equal(effects, 105);
});

test('restored trackers allocate distinct IDs even when the clock has not advanced', () => {
  const tracker = createExecutionTracker({ now: () => 5 });
  const input = { actor: 'agent' as const, goal: 'save', resourceId: 'doc', status: 'active' as const, currentAction: 'save', currentStep: 'write' };
  const first = tracker.beginSession(input);
  const restored = createExecutionTracker({ now: () => 5, initial: tracker.getState() });
  assert.notEqual(restored.beginSession(input).id, first.id);
});

test('command fingerprints use locale-independent key ordering', async () => {
  assert.equal(await fingerprintCommand('save', { 'ä': 1, z: 2 }), await hashText('["save",{"z":2,"ä":1}]'));
});

test('restoring an interrupted blocked task expires its approval and validates nested records', () => {
  const tracker = createExecutionTracker();
  const session = tracker.beginSession({ actor: 'agent', goal: 'delete', resourceId: 'doc', status: 'active', currentAction: 'delete', currentStep: 'approval' });
  const task = tracker.createTask({ sessionId: session.id, actionName: 'delete', resourceId: 'doc', status: 'blocked', title: 'delete', message: 'approval', progressPercent: 0 });
  tracker.createApproval({ sessionId: session.id, taskId: task.id, actionName: 'delete', resourceId: 'doc', status: 'requested', title: 'delete', riskSummary: 'delete', inputSummary: 'doc', createdBy: 'agent', payload: { retained: true } });
  const state = tracker.getState();
  const restored = createExecutionTracker({ initial: state }).getState();
  assert.equal(restored.tasks[0].status, 'failed');
  assert.equal(restored.approvals[0].status, 'expired');
  assert.deepEqual(restored.approvals[0].payload, { retained: true });
  for (const broken of [
    { ...state, sessions: [state.sessions[0], state.sessions[0]] },
    { ...state, latestSessionId: 'missing' },
    { ...state, tasks: [{ ...state.tasks[0], progressPercent: 200 }] },
    { ...state, approvals: [{ ...state.approvals[0], payload: 'invalid' }] },
    { ...state, approvals: [{ ...state.approvals[0], taskId: 'missing' }] },
    { ...state, sessions: [{ ...state.sessions[0], lastError: { code: 'forged', message: '', retryable: false } }] },
  ]) assert.throws(() => parseExecutionState(broken));
  tracker.replaceState(state);
  assert.equal(tracker.getState().tasks[0].status, 'failed');
});

test('terminal tasks cannot restart and known operation errors retain their code and details', async () => {
  const tracker = createExecutionTracker();
  const session = tracker.beginSession({ actor: 'human', goal: 'write', resourceId: 'doc', status: 'active', currentAction: 'write', currentStep: 'write' });
  const task = tracker.createTask({ sessionId: session.id, actionName: 'write', resourceId: 'doc', status: 'running', title: 'write', message: '', progressPercent: 0 });
  tracker.updateTask(task.id, { status: 'succeeded' });
  assert.throws(() => tracker.updateTask(task.id, { status: 'running' }), /非法任务/);
  const execute = createCommandExecutor(tracker, async () => {});
  const result = await execute('partial', 'write', {}, async () => { throw { code: 'PARTIAL_SIDE_EFFECT', message: 'saved', retryable: false, details: { retained: true } }; });
  assert.equal(result.error?.code, 'PARTIAL_SIDE_EFFECT');
  assert.equal(result.error?.details?.retained, true);
  const later = await execute('later', 'write', {}, async () => ({ ok: true }));
  assert.equal(later.ok, true);
});
