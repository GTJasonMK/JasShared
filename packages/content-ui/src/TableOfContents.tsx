"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractHeadingsFromContent } from "@jas/content-core/heading-content";
import { usePreviewScrollContainer, getScrollTarget, getScrollTop, findHeading, getHeadingTop } from "./ContentHost";

export function TableOfContents({ content, offsetTop = 100, idPrefix = "" }: { content: string; offsetTop?: number; idPrefix?: string }) {
  const container = usePreviewScrollContainer();
  const [activeId, setActiveId] = useState("");
  const items = useMemo(() => extractHeadingsFromContent(content).map((item) => ({ ...item, id: idPrefix + item.id })), [content, idPrefix]);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const target = getScrollTarget(container);
    if (!target || items.length === 0) return;
    const update = () => {
      let id = "";
      for (const item of items) {
        const element = findHeading(target, item.id);
        if (element && getHeadingTop(target, element) <= getScrollTop(target) + offsetTop) id = item.id;
      }
      if (getScrollTop(target) < 100) id = items[0].id;
      setActiveId(id);
    };
    update();
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [container, items, offsetTop]);
  useEffect(() => {
    const nav = navRef.current;
    const active = activeRef.current;
    if (!nav || !active) return;
    const top = active.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
    if (top < nav.scrollTop + 40 || top + active.offsetHeight > nav.scrollTop + nav.clientHeight - 40) nav.scrollTo({ top: Math.max(0, top - 60), behavior: "smooth" });
  }, [activeId]);
  if (!items.length || container === null) return null;
  const index = items.findIndex((item) => item.id === activeId);
  const progress = items.length > 1 ? Math.max(0, index) / (items.length - 1) * 100 : 0;
  const scroll = (top: number) => getScrollTarget(container)?.scrollTo({ top, behavior: "smooth" });
  return <nav ref={navRef} aria-label="文章目录" className={`jas-content toc-scrollbar w-56 max-h-[60vh] overflow-y-auto ${container ? "sticky top-24" : "hidden lg:block fixed right-8 top-32"}`}>
    <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-medium text-[var(--color-ink)]">目录</h4><span className="text-xs text-[var(--color-gray)]">{index + 1}/{items.length}</span></div>
    <div className="h-0.5 bg-[var(--color-paper-darker)] rounded-full mb-4 overflow-hidden"><div className="h-full bg-[var(--color-vermilion)]" style={{ width: `${progress}%` }} /></div>
    <ul className="space-y-1 text-sm">{items.map((item, itemIndex) => <li key={item.id} style={{ paddingLeft: (item.level - 2) * 12 }}>
      <a ref={activeId === item.id ? activeRef : undefined} href={`#${item.id}`} aria-current={activeId === item.id ? "location" : undefined}
        className={`block py-1.5 px-3 rounded-r break-words ${activeId === item.id ? "text-[var(--color-vermilion)] bg-[var(--color-vermilion)]/5 font-medium" : itemIndex <= index ? "text-[var(--color-ink-light)]" : "text-[var(--color-gray)]"}`}
        onClick={(event) => { event.preventDefault(); const target = getScrollTarget(container); const heading = target && findHeading(target, item.id); if (target && heading) { scroll(Math.max(0, getHeadingTop(target, heading) - 80)); setActiveId(item.id); } }}>{item.text}</a>
    </li>)}</ul>
    <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-paper-darker)]">
      <button className="flex-1 text-xs py-1.5" onClick={() => scroll(0)}>顶部</button>
      <button className="flex-1 text-xs py-1.5" onClick={() => scroll(container ? container.scrollHeight : document.documentElement.scrollHeight)}>底部</button>
    </div>
  </nav>;
}
