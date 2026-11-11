import { z } from "zod";

export const GRAPH_SCHEMA_VERSION = "1.0.0";
export const KNOWLEDGE_PROFILE_ID = "knowledge.v1";
export const CODE_PROFILE_ID = "code.v1";
export type GraphProfileId = string;
export type GraphEntityKind = "resource" | "concept" | "event" | "actor" | "artifact";
export type GraphRecordOrigin = string;
export type EdgeRelation = string;

export const NODE_COLORS = {
  default: { bg: "#FDFBF8", border: "#DDD5CB", text: "#3D3329" },
  red: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
  orange: { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" },
  yellow: { bg: "#FEFCE8", border: "#FDE047", text: "#854D0E" },
  green: { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
  blue: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
  purple: { bg: "#FAF5FF", border: "#C4B5FD", text: "#6B21A8" },
  pink: { bg: "#FDF2F8", border: "#F9A8D4", text: "#9D174D" },
} as const;
export type NodeColor = keyof typeof NODE_COLORS;
export const nodeColorConfig = NODE_COLORS;

export const EDGE_IMPORTANCE_RANKS = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"] as const;
export type EdgeImportance = (typeof EDGE_IMPORTANCE_RANKS)[number];
export type EdgeColor = "default" | EdgeImportance;
export const EDGE_COLOR_OPTIONS: EdgeColor[] = ["default", ...EDGE_IMPORTANCE_RANKS];
export const EDGE_COLORS: Record<EdgeColor, { stroke: string; label: string; description: string }> = {
  default: { stroke: "#64748B", label: "默认", description: "未设置重要度" },
  p0: { stroke: "#DC2626", label: "P0 核心", description: "核心知识点" },
  p1: { stroke: "#F97316", label: "P1 极重要", description: "非常关键的知识点" },
  p2: { stroke: "#F59E0B", label: "P2 很重要", description: "较关键的知识点" },
  p3: { stroke: "#EAB308", label: "P3 重要", description: "重要知识点" },
  p4: { stroke: "#84CC16", label: "P4 较重要", description: "较重要知识点" },
  p5: { stroke: "#22C55E", label: "P5 一般", description: "一般知识点" },
  p6: { stroke: "#10B981", label: "P6 次要", description: "次要知识点" },
  p7: { stroke: "#06B6D4", label: "P7 延伸", description: "延伸/补充知识点" },
  p8: { stroke: "#3B82F6", label: "P8 参考", description: "参考信息/旁支内容" },
  p9: { stroke: "#8B5CF6", label: "P9 可忽略", description: "低优先级内容" },
};
export const edgeColorConfig = EDGE_COLORS;

const nonempty = z.string().refine((value) => value.trim().length > 0, "必须为非空字符串");
const nodeColor = z.enum(Object.keys(NODE_COLORS) as [NodeColor, ...NodeColor[]]);
const edgeColor = z.enum(["default", ...EDGE_IMPORTANCE_RANKS]);
const evidence = z.object({ path: z.string(), startLine: z.number().optional(), endLine: z.number().optional(), note: z.string().optional() });
const nodeData = z.object({
  label: nonempty,
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  color: nodeColor.optional(),
  edgeColor: edgeColor.optional(),
  locked: z.boolean().optional(),
  lockMode: z.enum(["direct", "transitive", "level"]).optional(),
  lockDepth: z.number().int().min(1).optional(),
  entityKind: nonempty.optional(),
  profileId: nonempty.optional(),
  profileType: nonempty.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  source: z.string().optional(),
  sourcePath: z.string().optional(),
  symbolName: z.string().optional(),
  language: z.string().optional(),
  confidence: z.number().optional(),
  evidence: z.array(evidence).optional(),
  origin: z.string().optional(),
}).passthrough();
const edgeData = z.object({
  relation: z.string().optional(),
  label: z.string().optional(),
  relationType: z.string().optional(),
  color: edgeColor.optional(),
  confidence: z.number().optional(),
  evidence: z.array(evidence).optional(),
  origin: z.string().optional(),
}).passthrough();
const meta = z.object({
  schemaVersion: z.literal(GRAPH_SCHEMA_VERSION),
  profileId: nonempty,
  profileVersion: z.string().optional(),
  adapterId: z.string().optional(),
  generatedAt: z.number().optional(),
  sourceRef: z.string().optional(),
}).passthrough();

export const graphSchema = z.object({
  meta,
  nodes: z.array(z.object({
    id: nonempty,
    type: nonempty,
    position: z.object({ x: z.number(), y: z.number() }).strict(),
    data: nodeData,
  }).strict()),
  edges: z.array(z.object({
    id: nonempty,
    source: nonempty,
    target: nonempty,
    type: z.string().optional(),
    label: z.string().optional(),
    data: edgeData.optional(),
  }).strict()),
}).strict();

export type GraphData = z.infer<typeof graphSchema>;
export type GraphMeta = z.infer<typeof meta>;
export type GraphNode = GraphData["nodes"][number];
export type GraphEdge = GraphData["edges"][number];
export type KnowledgeNodeData = z.infer<typeof nodeData>;
export type KnowledgeEdgeData = z.infer<typeof edgeData>;
export type GraphEvidence = z.infer<typeof evidence>;
export type LockMode = NonNullable<KnowledgeNodeData["lockMode"]>;

export function getGraphJsonSchema() { return z.toJSONSchema(graphSchema); }
export function getGraphMutationSchemas() {
  return { position: z.toJSONSchema(graphSchema.shape.nodes.element.shape.position), nodeDataPatch: z.toJSONSchema(nodeData.partial()), evidence: z.toJSONSchema(evidence) };
}

export function createEmptyGraph(profileId = KNOWLEDGE_PROFILE_ID): GraphData {
  return { meta: { schemaVersion: GRAPH_SCHEMA_VERSION, profileId }, nodes: [], edges: [] };
}

export function getNodeColor(value: unknown): NodeColor {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NODE_COLORS, value) ? value as NodeColor : "default";
}

export function getEdgeStroke(value?: EdgeColor): string {
  return EDGE_COLORS[value ?? "default"]?.stroke ?? EDGE_COLORS.default.stroke;
}
