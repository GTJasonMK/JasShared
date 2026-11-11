import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { toHast } from "mdast-util-to-hast";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

const FALLBACK_HEADING_ID = "section";

export function generateHeadingId(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/^-+|-+$/g, "");

  return normalized || FALLBACK_HEADING_ID;
}

export function createHeadingIdResolver(): (text: string) => string {
  const headingIdCounts = new Map<string, number>();
  const used = new Set<string>();

  return (text: string) => {
    const baseId = generateHeadingId(text);
    let current = headingIdCounts.get(baseId) || 0;
    let id = current === 0 ? baseId : `${baseId}-${current}`;
    while (used.has(id)) id = `${baseId}-${++current}`;
    headingIdCounts.set(baseId, current + 1);
    used.add(id);
    return id;
  };
}

interface HeadingNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HeadingNode[];
  properties?: Record<string, unknown>;
}
const text = (node: HeadingNode): string => node.type === "text" ? node.value ?? "" : (node.children ?? []).map(text).join("");

export function assignContentHeadingIds(tree: HeadingNode, idPrefix = ""): HeadingItem[] {
  const resolve = createHeadingIdResolver();
  const headings: HeadingItem[] = [];
  const reserved = new Set<string>();
  const reserve = (node: HeadingNode) => {
    if (typeof node.properties?.id === "string") reserved.add(node.properties.id);
    node.children?.forEach(reserve);
  };
  reserve(tree);
  const visit = (node: HeadingNode, inFootnotes = false) => {
    const footnotes = inFootnotes || Boolean(node.properties?.dataFootnotes);
    if (node.tagName && /^h[1-4]$/.test(node.tagName)) {
      const label = text(node);
      if (!node.properties?.id) {
        let id = idPrefix + resolve(label);
        while (reserved.has(id)) id = idPrefix + resolve(label);
        node.properties = { ...node.properties, id };
      }
      if (node.tagName !== "h1" && !footnotes) headings.push({ id: String(node.properties.id), text: label, level: Number(node.tagName[1]) });
    }
    node.children?.forEach((child) => visit(child, footnotes));
  };
  visit(tree);
  return headings;
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

export function extractHeadingsFromContent(content: string): HeadingItem[] {
  return assignContentHeadingIds(toHast(parser.parse(content)));
}
