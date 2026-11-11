import type { ReactNode } from "react";
export { generateHeadingId as generateId } from "@jas/content-core/heading-content";
export function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) return extractText((children as { props: { children?: ReactNode } }).props.children);
  return "";
}
