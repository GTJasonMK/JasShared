"use client";
import { useMemo, type ReactNode } from "react";
import { contentDisplay, extractHeadingsFromContent, type CoverImage, type PageMetadata } from "@jas/content-core";
import ArticleBody from "./ArticleBody";
import { TableOfContents } from "./TableOfContents";
import { BackToTop } from "./BackToTop";
import { useContentHost, type PreviewLayout } from "./ContentHost";

export function ContentCover({ cover, lazy = false }: { cover: CoverImage; lazy?: boolean }) {
  const host = useContentHost(); const Image = host.Image ?? "img";
  return <figure className="mb-8"><Image {...cover} src={host.assetUrl?.(cover.src) ?? cover.src} className="block w-full h-auto rounded-lg" loading={lazy ? "lazy" : "eager"} /></figure>;
}

export function PageView({ page, comments, layout = "page" }: { page: PageMetadata & { content: string; error?: string }; comments?: ReactNode; layout?: PreviewLayout }) {
  const host = useContentHost();
  const display = contentDisplay(page, "page");
  const headings = useMemo(() => extractHeadingsFromContent(page.content), [page.content]);
  return <article className={`jas-content ${layout === "pane" ? "min-w-0 py-6" : "max-w-3xl mx-auto px-6 py-12"}`}>
    <header className="mb-10"><h1 className="text-3xl font-bold break-words">{page.title}</h1>{page.description && <p className="text-[var(--color-gray)] mt-4">{page.description}</p>}</header>
    {page.error && <p role="alert" className="text-red-700 mb-4">{page.error}</p>}
    {page.display?.cover && <ContentCover cover={page.display.cover} />}
    <ArticleBody content={page.content} />
    {display.toc && headings.length > 0 && layout === "page" && <TableOfContents headings={headings} />}
    {display.comments && host.commentsEnabled !== false && comments && <section className="mt-12"><h2 className="text-xl mb-6">评论与讨论</h2>{comments}</section>}
    <BackToTop />
  </article>;
}
