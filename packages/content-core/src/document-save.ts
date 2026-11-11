import type { ContentMetadata, ContentType, LineEnding } from "./types";
import { serializeDocContentPreservingFrontmatter, serializeMarkdownContentPreservingFrontmatter } from "./content-parser";

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
  } else if (file.type === "doc") {
    output = serializeDocContentPreservingFrontmatter(file.metadata as { title: string; date?: string }, file.content, {
      includeFrontmatter: file.hasFrontmatter || Boolean((file.metadata as { title?: string }).title),
      frontmatterBlock: file.frontmatterBlock,
    });
  } else {
    output = serializeMarkdownContentPreservingFrontmatter(file.metadata as Parameters<typeof serializeMarkdownContentPreservingFrontmatter>[0], file.content, file);
  }
  output = output.replace(/\r\n/g, "\n");
  if (file.lineEnding === "crlf") output = output.replace(/\n/g, "\r\n");
  return file.hasBom ? "\uFEFF" + output.replace(/^\uFEFF/, "") : output;
}
