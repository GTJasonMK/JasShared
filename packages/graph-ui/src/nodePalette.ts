import { getNodeColor, NODE_COLORS, type KnowledgeNodeData } from "@jas/graph-core";

export function getNodePalette(value: KnowledgeNodeData["color"]) {
  const name = getNodeColor(value);
  if (name === "default") return { bg: "var(--color-surface)", border: "var(--color-border)", text: "var(--color-text)", tagBg: "var(--color-surface-dark)" };
  const palette = NODE_COLORS[name];
  return { ...palette, tagBg: `${palette.border}40` };
}
