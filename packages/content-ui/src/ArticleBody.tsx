"use client";
import { MarkdownRenderer } from "./MarkdownRenderer";

export default function ArticleBody({ content, idPrefix = "" }: {
  content: string; idPrefix?: string;
}) {
  return <div className="jas-content min-w-0">
    <MarkdownRenderer content={content} idPrefix={idPrefix} />
  </div>;
}
