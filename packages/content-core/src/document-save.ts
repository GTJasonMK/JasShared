import type { ContentMetadata, ContentType, LineEnding } from "./types";
import { parseDocument, stringify } from "yaml";
import { parseMarkdownContent } from "./content-parser";
import type { JasBlogContentType } from "./types";

export function createContentDraft(raw: string, type: JasBlogContentType): string {
  const parsed = parseMarkdownContent(raw, type);
  return serializeContentDocument({ ...parsed, type, metadata: { ...parsed.metadata, publication: "draft" }, frontmatterBlock: parsed.frontmatterBlock ?? undefined, metadataDirty: true });
}

export interface ContentDocumentSaveInput {
  type: ContentType;
  metadata: ContentMetadata;
  content: string;
  hasFrontmatter: boolean;
  frontmatterBlock?: string;
  frontmatterRaw?: Record<string, unknown>;
  metadataDirty: boolean;
  hasBom: boolean;
  lineEnding: LineEnding;
}

export function serializeContentDocument(file: ContentDocumentSaveInput): string {
  let output: string;
  if (file.hasFrontmatter && file.frontmatterBlock && !file.metadataDirty) {
    output = file.frontmatterBlock + file.content;
  } else {
    output = serializeFrontmatter(file) + file.content;
  }
  output = output.replace(/\r\n/g, "\n");
  if (file.lineEnding === "crlf") output = output.replace(/\n/g, "\r\n");
  return file.hasBom ? "\uFEFF" + output.replace(/^\uFEFF/, "") : output;
}

const yamlOptions = { lineWidth: 0, defaultStringType: "PLAIN", defaultKeyType: "PLAIN" } as const;

function cleanMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value) && !value.length) return ["tags", "companions", "techStack"].includes(key);
    return value !== "" || !["demo", "icon"].includes(key);
  }).map(([key, value]) => [key, value && typeof value === "object" && !Array.isArray(value) ? cleanMetadata(value as Record<string, unknown>) : value]));
}

function serializeFrontmatter(file: ContentDocumentSaveInput): string {
  const metadata = { ...file.metadata };
  const cleaned = cleanMetadata(metadata);
  if (file.frontmatterBlock) {
    const match = file.frontmatterBlock.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)$/);
    if (!match) throw new Error("frontmatter 边界格式无效，已保留原文。");
    const doc = parseDocument(match[2]);
    if (doc.errors.length) throw new Error(`frontmatter YAML 解析失败，已保留原文：${doc.errors[0].message}`);
    for (const key of Object.keys(metadata)) if (!(key in cleaned)) doc.delete(key);
    for (const [key, value] of Object.entries(cleaned)) doc.set(key, value);
    return match[1] + doc.toString(yamlOptions).replace(/\n$/, "") + match[3];
  }
  const merged = cleanMetadata({ ...file.frontmatterRaw, ...metadata });
  if (file.type === "doc" && !file.hasFrontmatter && !Object.values(merged).some(Boolean)) return "";
  return `---\n${stringify(merged, yamlOptions)}---\n`;
}
