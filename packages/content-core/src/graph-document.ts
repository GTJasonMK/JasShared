import { createEmptyGraph, parseGraphData, type GraphData } from "@jas/graph-core";
import { findGraphCodeBlocks } from "./graph-blocks";
export { isValidGraphData } from "@jas/graph-core";


export interface ParsedGraphDocument { graphData: GraphData; remainingContent: string; error: string | null }

export function parseGraphDocument(content: string): ParsedGraphDocument {
  const match = findGraphCodeBlocks(content)[0];
  if (!match) return { graphData: createEmptyGraph(), remainingContent: content.trim(), error: "缺少 ```graph 代码块：知识图谱文件必须包含 graph 数据" };
  try {
    const graphData = parseGraphData(JSON.parse(match.body.trim()));
    return { graphData, remainingContent: (content.slice(0, match.start) + content.slice(match.end)).trim(), error: null };
  } catch (error) {
    const label = error instanceof SyntaxError ? "graph 代码块 JSON 解析失败" : "graph 数据格式无效";
    return { graphData: createEmptyGraph(), remainingContent: content.trim(), error: `${label}：${error instanceof Error ? error.message : String(error)}` };
  }
}
