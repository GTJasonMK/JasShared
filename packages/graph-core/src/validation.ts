import { graphSchema, type GraphData } from "./schema";

export interface GraphJsonValidationIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
  suggestion?: string;
}

export interface GraphJsonValidationReport {
  valid: boolean;
  schemaVersion: string | null;
  profileId: string | null;
  summary: { nodeCount: number; edgeCount: number };
  errors: GraphJsonValidationIssue[];
  warnings: GraphJsonValidationIssue[];
}

function inspectGraph(raw: unknown) {
  const parsed = graphSchema.safeParse(raw);
  const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const meta = record.meta && typeof record.meta === "object" ? record.meta as Record<string, unknown> : {};
  const errors: GraphJsonValidationIssue[] = parsed.success ? [] : parsed.error.issues.map((issue) => ({
    severity: "error",
    code: "VALIDATION_FAILED",
    path: "$" + issue.path.map((part) => typeof part === "number" ? `[${part}]` : `.${String(part)}`).join(""),
    message: issue.message,
  }));
  const warnings: GraphJsonValidationIssue[] = [];

  if (parsed.success) {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const [index, node] of parsed.data.nodes.entries()) {
      if (nodeIds.has(node.id)) errors.push({ severity: "error", code: "DUPLICATE_NODE_ID", path: `$.nodes[${index}].id`, message: `节点 id 重复：${node.id}` });
      nodeIds.add(node.id);
      if (node.data.profileId && node.data.profileId !== parsed.data.meta.profileId) warnings.push({ severity: "warning", code: "NODE_PROFILE_ID_MISMATCH", path: `$.nodes[${index}].data.profileId`, message: "节点与图谱的 profileId 不同。" });
      for (const field of ["profileId", "profileType"] as const) {
        if (!node.data[field]) warnings.push({ severity: "warning", code: `MISSING_NODE_${field === "profileId" ? "PROFILE_ID" : "PROFILE_TYPE"}`, path: `$.nodes[${index}].data.${field}`, message: `节点缺少 ${field}，建议由上游 skill 输出明确的语义字段。` });
      }
    }
    for (const [index, edge] of parsed.data.edges.entries()) {
      if (edgeIds.has(edge.id)) errors.push({ severity: "error", code: "DUPLICATE_EDGE_ID", path: `$.edges[${index}].id`, message: `边 id 重复：${edge.id}` });
      edgeIds.add(edge.id);
      for (const field of ["source", "target"] as const) {
        if (!nodeIds.has(edge[field])) errors.push({ severity: "error", code: `MISSING_EDGE_${field.toUpperCase()}_NODE`, path: `$.edges[${index}].${field}`, message: `${field} 节点不存在：${edge[field]}` });
      }
    }
  }

  const report: GraphJsonValidationReport = {
    valid: errors.length === 0,
    schemaVersion: typeof meta.schemaVersion === "string" ? meta.schemaVersion : null,
    profileId: typeof meta.profileId === "string" ? meta.profileId : null,
    summary: { nodeCount: Array.isArray(record.nodes) ? record.nodes.length : 0, edgeCount: Array.isArray(record.edges) ? record.edges.length : 0 },
    errors,
    warnings,
  };
  return { parsed, report };
}

export function validateGraphJsonPayload(raw: unknown): GraphJsonValidationReport {
  return inspectGraph(raw).report;
}

export function parseGraphData(raw: unknown): GraphData {
  const { parsed, report } = inspectGraph(raw);
  if (!parsed.success || !report.valid) throw new Error(report.errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  return parsed.data;
}
