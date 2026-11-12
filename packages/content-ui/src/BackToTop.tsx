"use client";
import { useEffect, useState } from "react";
import { usePreviewScrollContainer, getScrollTarget, getScrollTop } from "./ContentHost";

export function BackToTop() {
  const container = usePreviewScrollContainer();
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState({ right: 32, bottom: 32 });
  useEffect(() => {
    const target = getScrollTarget(container);
    if (!target) return;
    const update = () => {
      setVisible(getScrollTop(target) > 300);
      if (container) { const rect = container.getBoundingClientRect(); setOffset({ right: Math.max(0, window.innerWidth - rect.right + 32), bottom: Math.max(0, window.innerHeight - rect.bottom + 32) }); }
    };
    update();
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = container ? new ResizeObserver(update) : null;
    if (container) observer?.observe(container);
    return () => { target.removeEventListener("scroll", update); window.removeEventListener("resize", update); observer?.disconnect(); };
  }, [container]);
  if (!visible) return null;
  return <div className="jas-content"><button aria-label="返回顶部" title="返回顶部"
    className="w-11 h-11 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full shadow-lg flex items-center justify-center z-50"
    style={{ position: "fixed", ...offset }} onClick={() => getScrollTarget(container)?.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
  </button></div>;
}
