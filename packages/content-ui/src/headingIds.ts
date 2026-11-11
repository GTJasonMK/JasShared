import { assignContentHeadingIds } from "@jas/content-core/heading-content";

export function assignHeadingIds({ idPrefix = "" }: { idPrefix?: string } = {}) {
  return (tree: Parameters<typeof assignContentHeadingIds>[0]) => { assignContentHeadingIds(tree, idPrefix); };
}
