"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HeadingItem } from "@jas/content-core/heading-content";
import { usePreviewScrollContainer, getScrollTarget, findHeading, scrollToHeading } from "./ContentHost";

export function TableOfContents({ headings, offsetTop = 100, idPrefix = "" }: { headings: HeadingItem[]; offsetTop?: number; idPrefix?: string }) {
  const container = usePreviewScrollContainer();
  const [activeId, setActiveId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const items = useMemo(() => headings.map((item) => ({ ...item, id: idPrefix + item.id })), [headings, idPrefix]);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = getScrollTarget(container);
    if (!target || !items.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = container?.getBoundingClientRect().top ?? 0;
      let id = items[0].id;
      for (const item of items) {
        const heading = findHeading(target, item.id);
        if (heading && heading.getBoundingClientRect().top - top <= offsetTop) id = item.id;
      }
      setActiveId(id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    target.addEventListener("scroll", schedule, { passive: true });
    return () => { target.removeEventListener("scroll", schedule); cancelAnimationFrame(frame); };
  }, [container, items, offsetTop]);

  useEffect(() => {
    const nav = navRef.current;
    const active = activeRef.current;
    if (!nav || !active) return;
    const top = active.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
    if (top < nav.scrollTop || top + active.offsetHeight > nav.scrollTop + nav.clientHeight) nav.scrollTop = Math.max(0, top - nav.clientHeight / 2);
  }, [activeId, expanded]);

  if (!items.length || container === null) return null;
  return <nav className="toc-panel" aria-label="文章目录" data-pagefind-ignore>
    <p className="toc-heading">目录</p>
    <button type="button" className="toc-trigger" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>
      文章目录
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
    </button>
    <div id={listId} className={`toc-body${expanded ? " is-open" : ""}`}>
      <div ref={navRef} className="toc-scrollbar"><ul>{items.map((item) => <li key={item.id} style={{ paddingLeft: Math.max(0, item.level - 2) * 12 }}>
        <a ref={activeId === item.id ? activeRef : undefined} href={`#${item.id}`} aria-current={activeId === item.id ? "location" : undefined} onClick={(event) => {
          const target = getScrollTarget(container);
          const heading = target && findHeading(target, item.id);
          if (!target || !heading) return;
          event.preventDefault();
          scrollToHeading(heading, container, offsetTop);
          setActiveId(item.id);
        }}>{item.text}</a>
      </li>)}</ul></div>
    </div>
  </nav>;
}
