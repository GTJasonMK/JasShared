import { createHeadingIdResolver } from "@jas/content-core/heading-content";

interface HtmlNode {
  type: string; tagName?: string; value?: string;
  children?: HtmlNode[]; properties?: Record<string, unknown>;
}
const text = (node: HtmlNode): string => node.type === "text" ? node.value ?? "" : (node.children ?? []).map(text).join("");

export function assignHeadingIds({ idPrefix = "" }: { idPrefix?: string } = {}) {
  return (tree: HtmlNode) => {
    // 解析过程各自分配 ID，React 重复渲染不再消耗共享计数器。
    const resolve = createHeadingIdResolver();
    const visit = (node: HtmlNode) => {
      if (node.tagName && /^h[1-4]$/.test(node.tagName)) node.properties = { ...node.properties, id: idPrefix + resolve(text(node)) };
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
