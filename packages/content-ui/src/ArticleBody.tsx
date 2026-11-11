"use client";
import { createHeadingIdResolver, parseArticleContentSegments } from "@jas/content-core";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TableOfContents } from "./TableOfContents";
import { BackToTop } from "./BackToTop";
import { GraphBlock } from "./GraphBlock";

export default function ArticleBody({ content, showTableOfContents = false, showBackToTop = false, idPrefix = "" }: {
  content: string; showTableOfContents?: boolean; showBackToTop?: boolean; idPrefix?: string;
}) {
  const resolveId = createHeadingIdResolver();
  const resolveHeadingId = (text: string) => idPrefix + resolveId(text);
  return <div className="jas-content min-w-0">
    {showTableOfContents && <TableOfContents content={content} idPrefix={idPrefix} />}
    <div className="prose-chinese">{parseArticleContentSegments(content).map((segment, index) => {
      if (segment.type === "markdown") return <MarkdownRenderer key={index} content={segment.content} resolveHeadingId={resolveHeadingId} />;
      if (segment.type === "error") return <div key={index}><p role="alert" className="text-red-700">{segment.error}</p><pre>{segment.content}</pre></div>;
      return <div key={index} className="my-8 not-prose"><GraphBlock data={segment.data} /></div>;
    })}</div>
    {showBackToTop && <BackToTop />}
  </div>;
}
