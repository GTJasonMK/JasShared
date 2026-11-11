import { parseGraphData, type GraphData } from "@jas/graph-core";
import { findGraphCodeBlocks } from "./graph-blocks";

export type ArticleContentSegment =
  | { type: "markdown"; content: string }
  | { type: "graph"; data: GraphData }
  | { type: "error"; content: string; error: string };

export function parseArticleContentSegments(content: string): ArticleContentSegment[] {
  const segments: ArticleContentSegment[] = [];
  let lastIndex = 0;
  for (const block of findGraphCodeBlocks(content)) {
    const markdown = content.slice(lastIndex, block.start).trim();
    if (markdown) segments.push({ type: "markdown", content: markdown });
    try {
      segments.push({ type: "graph", data: parseGraphData(JSON.parse(block.body.trim())) });
    } catch (error) {
      segments.push({ type: "error", content: content.slice(block.start, block.end), error: error instanceof Error ? error.message : String(error) });
    }
    lastIndex = block.end;
  }
  const remaining = content.slice(lastIndex).trim();
  if (remaining) segments.push({ type: "markdown", content: remaining });
  return segments;
}
