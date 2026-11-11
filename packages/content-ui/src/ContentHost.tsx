"use client";

import { createContext, useContext, type ComponentType, type ImgHTMLAttributes, type ReactNode } from "react";
import type { MarkdownLinkProps } from "./MarkdownRenderer";
import type { JasBlogContentType } from "@jas/content-core";

export type PreviewLayout = "page" | "pane";
export interface ContentHost {
  scrollContainer?: HTMLElement | null;
  theme?: "light" | "dark";
  Image?: ComponentType<ImgHTMLAttributes<HTMLImageElement>>;
  contentHref?: (type: JasBlogContentType, slug: string) => string;
  tagHref?: (tag: string) => string;
  renderLink?: (props: MarkdownLinkProps, renderDefault: (props: MarkdownLinkProps) => ReactNode) => ReactNode;
}

const Context = createContext<ContentHost>({});
export function ContentHostProvider({ children, ...host }: ContentHost & { children: ReactNode }) {
  return <Context.Provider value={host}><div className="jas-content" data-theme={host.theme} style={{ display: "contents" }}>{children}</div></Context.Provider>;
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
