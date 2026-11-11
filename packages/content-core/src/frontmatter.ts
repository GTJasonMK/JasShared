import { parseMarkdownContent } from "./content-parser";

export interface ParsedFrontmatter { data: Record<string, unknown>; content: string; error?: string }

export function parseFrontmatter(raw: string, label: string): ParsedFrontmatter {
  const parsed = parseMarkdownContent(raw, "doc");
  return {
    data: parsed.frontmatterRaw,
    content: parsed.content,
    error: parsed.issues.length ? parsed.issues.map((issue) => issue.replace(/^doc /, `${label} `)).join("\n") : undefined,
  };
}
