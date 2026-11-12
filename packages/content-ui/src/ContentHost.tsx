"use client";

import { createContext, useContext, useSyncExternalStore, type ComponentType, type ImgHTMLAttributes, type ReactNode } from "react";
import type { MarkdownLinkProps } from "./MarkdownRenderer";
import type { JasBlogContentType, SiteConfig } from "@jas/content-core";

export type PreviewLayout = "page" | "pane";
export interface ContentHost {
  scrollContainer?: HTMLElement | null;
  theme?: "light" | "dark";
  Image?: ComponentType<ImgHTMLAttributes<HTMLImageElement>>;
  assetUrl?: (src: string) => string;
  sections?: SiteConfig["sections"];
  section?: keyof SiteConfig["sections"];
  commentsEnabled?: boolean;
  contentHref?: (type: JasBlogContentType, slug: string) => string;
  tagHref?: (tag: string) => string;
  renderLink?: (props: MarkdownLinkProps, renderDefault: (props: MarkdownLinkProps) => ReactNode) => ReactNode;
}

const Context = createContext<ContentHost>({});
function subscribeTheme(update: () => void) {
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const rootTheme = (): "light" | "dark" => document.documentElement.classList.contains("dark") ? "dark" : "light";
export function useRootTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribeTheme, rootTheme, () => "light");
}
export function ContentHostProvider({ children, ...host }: ContentHost & { children: ReactNode }) {
  const parent = useContext(Context);
  const resolved = useRootTheme();
  const value = { ...parent, ...host, theme: host.theme ?? parent.theme ?? resolved };
  return <Context.Provider value={value}><div className="jas-content" data-theme={host.theme} style={{ display: "contents" }}>{children}</div></Context.Provider>;
}
export function useContentHost(): ContentHost { return useContext(Context); }
export function usePreviewScrollContainer(): HTMLElement | null | undefined { return useContentHost().scrollContainer; }
export function getScrollTarget(container?: HTMLElement | null): HTMLElement | Window | null {
  return container === undefined ? (typeof window === "undefined" ? null : window) : container;
}
export function getScrollTop(target: HTMLElement | Window): number { return target instanceof HTMLElement ? target.scrollTop : target.scrollY; }
export function findHeading(target: HTMLElement | Window, id: string): HTMLElement | null {
  return target instanceof HTMLElement ? target.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : document.getElementById(id);
}
export function getHeadingTop(target: HTMLElement | Window, element: HTMLElement): number {
  return element.getBoundingClientRect().top - (target instanceof HTMLElement ? target.getBoundingClientRect().top : 0) + getScrollTop(target);
}
export function scrollToHeading(heading: HTMLElement, container?: HTMLElement | null, offsetTop = 100): void {
  const target = getScrollTarget(container);
  if (!target) return;
  target.scrollTo({ top: Math.max(0, getHeadingTop(target, heading) - offsetTop), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  if (!container) history.replaceState(null, "", `#${encodeURIComponent(heading.id)}`);
}
