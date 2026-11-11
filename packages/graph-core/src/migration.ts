import { GRAPH_SCHEMA_VERSION, KNOWLEDGE_PROFILE_ID } from "./schema";
import { parseGraphData } from "./index";

export function migrateGraphData(raw: unknown, timestamp: number) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("图谱必须为对象。");
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error("图谱必须包含 nodes 和 edges 数组。");
  const changes: string[] = [];
  const existingMeta = value.meta && typeof value.meta === "object" ? value.meta as Record<string, unknown> : {};
  const meta = { ...existingMeta };
  if (!meta.schemaVersion) { meta.schemaVersion = GRAPH_SCHEMA_VERSION; changes.push("meta.schemaVersion"); }
  if (!meta.profileId) {
    const inferred = value.nodes.find((node) => node?.data?.profileId)?.data.profileId;
    meta.profileId = inferred || KNOWLEDGE_PROFILE_ID;
    changes.push("meta.profileId");
  }
  const nodes = value.nodes.map((node, index) => {
    if (!node || typeof node !== "object" || !node.data || typeof node.data !== "object") throw new Error(`nodes[${index}] 无法无损迁移。`);
    const data = { ...node.data };
    for (const [field, defaultValue] of Object.entries({ content: "", tags: [], createdAt: timestamp, updatedAt: timestamp })) {
      if (data[field] === undefined) { data[field] = defaultValue; changes.push(`nodes[${index}].data.${field}`); }
    }
    if (!node.type) changes.push(`nodes[${index}].type`);
    return { ...node, type: node.type ?? "knowledgeNode", data };
  });
  return { graph: parseGraphData({ ...value, meta, nodes }), changes };
}
