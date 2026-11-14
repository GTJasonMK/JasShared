import fs from "node:fs";
import { createHash } from "node:crypto";
import { CONTENT_SECTIONS, readPublishedAt, serializeContentDocument } from "@jas/content-core";
import { atomicWrite, fileVersion, workspaceFile } from "./files";
import { PHOTO_FILE, readPhotos, readSite, workspaceDocuments } from "./workspace";

// 调用方持有工作区锁；记录在构建前落盘，失败后重试沿用原时间。
export function recordFirstPublications(root: string, timestamp = new Date().toISOString()): string[] {
  const publishedAt = readPublishedAt(timestamp);
  if (!publishedAt?.includes("T")) throw new Error("自动发布时间必须包含完整时刻。");
  const site = readSite(root);
  const documents = workspaceDocuments(root);
  const plans: Array<{ relative: string; before: string; next: string }> = [];
  for (const document of documents) {
    const section = CONTENT_SECTIONS[document.type];
    if (document.metadata.publication !== "published" || document.metadata.publishedAt || (section && !site.sections[section].enabled)) continue;
    if (document.issues.length) throw new Error(`${document.relative}：${document.issues.join("；")}`);
    plans.push({ relative: document.relative, before: createHash("sha256").update(document.raw).digest("hex"), next: serializeContentDocument({ ...document, type: document.type, frontmatterBlock: document.frontmatterBlock ?? undefined, metadata: { ...document.metadata, publishedAt }, metadataDirty: true }) });
  }
  if (site.sections.photography.enabled) {
    const before = fileVersion(workspaceFile(root, PHOTO_FILE));
    const photos = readPhotos(root);
    if (photos.some((photo) => photo.publication === "published" && !photo.publishedAt)) {
      plans.push({ relative: PHOTO_FILE, before, next: JSON.stringify(photos.map((photo) => photo.publication === "published" && !photo.publishedAt ? { ...photo, publishedAt } : photo), null, 2) + "\n" });
    }
  }
  for (const plan of plans) if (fileVersion(workspaceFile(root, plan.relative)) !== plan.before) throw new Error(`记录发布时间前内容已变化：${plan.relative}`);
  for (const plan of plans) atomicWrite(workspaceFile(root, plan.relative), plan.next);
  return plans.map(({ relative }) => relative);
}
