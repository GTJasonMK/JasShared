export interface GraphCodeBlock { start: number; end: number; bodyStart: number; bodyEnd: number; body: string }

export function findGraphCodeBlocks(content: string): GraphCodeBlock[] {
  const blocks: GraphCodeBlock[] = [];
  let opening: { start: number; bodyStart: number; fence: string; graph: boolean } | undefined;
  for (const match of content.matchAll(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/gm)) {
    if (!opening) {
      opening = { start: match.index!, bodyStart: match.index! + match[0].length + 1, fence: match[1], graph: match[2].trim() === "graph" };
      continue;
    }
    if (match[1][0] !== opening.fence[0] || match[1].length < opening.fence.length || match[2].trim()) continue;
    if (opening.graph) blocks.push({ start: opening.start, end: match.index! + match[0].length, bodyStart: opening.bodyStart, bodyEnd: match.index!, body: content.slice(opening.bodyStart, match.index!) });
    opening = undefined;
  }
  return blocks;
}
