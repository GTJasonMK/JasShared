import type { ReactNode } from "react";
import type { HeadingItem } from "@jas/content-core/heading-content";
import { BackToTop } from "./BackToTop";
import { TableOfContents } from "./TableOfContents";
import type { PreviewLayout } from "./ContentHost";

export function ReadingLayout({ header, back, headings = [], layout = "page", children }: {
  header: ReactNode; back?: ReactNode; headings?: HeadingItem[]; layout?: PreviewLayout; children: ReactNode;
}) {
  const toc = layout === "page" && headings.length > 0;
  return <article className={`jas-content reading-frame${layout === "pane" ? " reading-pane" : ""}`}>
    {back}
    <div className={`reading-grid${toc ? " reading-with-toc" : ""}`}>
      <header className="reading-header">{header}</header>
      {toc && <aside className="reading-toc"><TableOfContents headings={headings} /></aside>}
      <div className="reading-body">{children}</div>
    </div>
    <BackToTop />
  </article>;
}
