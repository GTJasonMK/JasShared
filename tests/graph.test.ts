import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyGraph, deserializeGraphData, serializeGraphData, validateGraphJsonPayload } from "../packages/graph-core/src/index";
import { migrateGraphData } from "../packages/graph-core/src/migration";

function graph() {
  return {
    ...createEmptyGraph("code.v1"),
    meta: { ...createEmptyGraph("code.v1").meta, sourceRef: "src/main.ts", custom: { retained: true } },
    nodes: [{ id: "a", type: "knowledgeNode", position: { x: 0, y: 0 }, data: { label: "main", content: "<p>source</p>", tags: ["code"], createdAt: 1, updatedAt: 2, lockMode: "level" as const, lockDepth: 2, entityKind: "custom", evidence: [{ path: "src/main.ts", startLine: 1 }], custom: { retained: true } } }],
    edges: [],
  };
}

test("graph round trip retains meta, custom semantics, evidence and depth locks", () => {
  const input = graph();
  assert.deepEqual(deserializeGraphData(serializeGraphData(input)), input);
});

test("graph rejects duplicate IDs and dangling edges without repairing data", () => {
  const input = graph();
  const result = validateGraphJsonPayload({ ...input, nodes: [...input.nodes, input.nodes[0]], edges: [{ id: "e", source: "a", target: "missing" }] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map((issue) => issue.code), ["DUPLICATE_NODE_ID", "MISSING_EDGE_TARGET_NODE"]);
  assert.equal(input.nodes.length, 1);
});

test("legacy graph migration is explicit and never mutates the source", () => {
  const legacy = { nodes: [{ id: "a", position: { x: 0, y: 0 }, data: { label: "retained", custom: "retained" } }], edges: [] };
  assert.throws(() => deserializeGraphData(JSON.stringify(legacy)), /meta/);
  const migrated = migrateGraphData(legacy, 123);
  assert.equal(migrated.graph.meta.schemaVersion, "1.0.0");
  assert.equal(migrated.graph.nodes[0].data.custom, "retained");
  assert.equal(migrated.graph.nodes[0].data.createdAt, 123);
  assert.ok(migrated.changes.length);
  assert.equal("meta" in legacy, false);
  assert.deepEqual(migrateGraphData(migrated.graph, 456), { graph: migrated.graph, changes: [] });
});
