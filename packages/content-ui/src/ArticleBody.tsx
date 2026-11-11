"use client";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TableOfContents } from "./TableOfContents";
import { BackToTop } from "./BackToTop";

export default function ArticleBody({ content, showTableOfContents = false, showBackToTop = false, idPrefix = "" }: {
  content: string; showTableOfContents?: boolean; showBackToTop?: boolean; idPrefix?: string;
}) {
  return <div className="jas-content min-w-0">
    {showTableOfContents && <TableOfContents content={content} idPrefix={idPrefix} />}
    <MarkdownRenderer content={content} idPrefix={idPrefix} />
    {showBackToTop && <BackToTop />}
  </div>;
}
