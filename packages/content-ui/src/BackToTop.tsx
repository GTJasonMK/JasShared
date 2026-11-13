"use client";
import { useEffect, useState } from "react";
import { usePreviewScrollContainer, getScrollTarget, getScrollTop } from "./ContentHost";

export function BackToTop() {
  const container = usePreviewScrollContainer();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = getScrollTarget(container);
    if (!target) return;
    const update = () => setVisible(getScrollTop(target) > 300);
    update();
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [container]);
  if (!visible) return null;
  return <div className="jas-content mt-8 flex justify-end"><button aria-label="返回顶部" title="返回顶部"
    className="w-11 h-11 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full shadow-lg flex items-center justify-center"
    onClick={() => getScrollTarget(container)?.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
  </button></div>;
}
