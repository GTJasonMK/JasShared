import { formatPublishedAt, type PublicationMetadata } from "@jas/content-core";

export function PublicationTime({ metadata }: { metadata: Pick<PublicationMetadata, "publication" | "publishedAt"> }) {
  if (!metadata.publishedAt && metadata.publication !== "published") return null;
  return <span className="publication-time">{metadata.publishedAt ? <><span>发布于</span><time dateTime={metadata.publishedAt}>{formatPublishedAt(metadata.publishedAt)}</time></> : <span>发布时间待补录</span>}</span>;
}
