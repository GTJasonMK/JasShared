"use client";
import type { MouseEventHandler, ReactNode } from "react";
import { useContentHost } from "./ContentHost";

export function ContentLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  const host = useContentHost();
  const props = { href, children, className, onClick };
  const render = () => <a {...props} />;
  return <>{host.renderLink ? host.renderLink(props, render) : render()}</>;
}
