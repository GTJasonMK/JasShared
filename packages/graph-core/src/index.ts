import type { GraphData } from "./schema";
import { parseGraphData, validateGraphJsonPayload } from "./validation";

export * from "./schema";
export * from "./validation";

export function isValidGraphData(raw: unknown): raw is GraphData {
  return validateGraphJsonPayload(raw).valid;
}

export function serializeGraphData(graph: GraphData): string {
  return JSON.stringify(parseGraphData(graph));
}

export function deserializeGraphData(json: string): GraphData {
  return parseGraphData(JSON.parse(json.replace(/^\uFEFF/, "")));
}
