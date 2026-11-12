"use client";
import { useMemo, type ReactNode } from "react";
import { contentDisplay, extractHeadingsFromContent, type CoverImage, type PageMetadata } from "@jas/content-core";
import ArticleBody from "./ArticleBody";
import { ReadingLayout } from "./ReadingLayout";
import { useContentHost, type PreviewLayout } from "./ContentHost";

export function ContentCover({ cover, lazy = false }: { cover: CoverImage; lazy?: boolean }) {
  const host = useContentHost(); const Image = host.Image ?? "img";
  return <figure className="mb-8"><Image {...cover} src={host.assetUrl?.(cover.src) ?? cover.src} className="block w-full h-auto rounded-lg" loading={lazy ? "lazy" : "eager"} /></figure>;
}

export function PageView({ page, comments, layout = "page" }: { page: PageMetadata & { content: string; error?: string }; comments?: ReactNode; layout?: PreviewLayout }) {
  const host = useContentHost();
  const display = contentDisplay(page, "page");
  const headings = useMemo(() => extractHeadingsFromContent(page.content), [page.content]);
  return <ReadingLayout layout={layout} headings={display.toc ? headings : []} header={<><h1>{page.title}</h1>{page.description && <p className="text-[var(--color-text-muted)] mt-4">{page.description}</p>}</>}>
    {page.error && <p role="alert" className="text-[var(--color-danger)] mb-4">{page.error}</p>}
    {page.display?.cover && <ContentCover cover={page.display.cover} />}
    <ArticleBody content={page.content} />
    {display.comments && host.commentsEnabled !== false && comments && <section className="content-comments"><h2>评论与讨论</h2>{comments}</section>}
  </ReadingLayout>;
}
