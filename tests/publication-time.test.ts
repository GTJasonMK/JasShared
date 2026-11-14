import assert from "node:assert/strict";
import test from "node:test";
import { createContentDraft, parseMarkdownContent, serializeContentDocument, parsePhotos, readPublishedAt, publicationDay, publicationParts, formatPublishedAt } from "../packages/content-core/src/index";

test("发布时间保留历史日期精度，完整时间必须包含时区且统一为UTC", () => {
  assert.equal(readPublishedAt(undefined), undefined);
  assert.equal(readPublishedAt("2026-11-12"), "2026-11-12");
  assert.equal(readPublishedAt("2026-11-14T08:30:00+08:00"), "2026-11-14T00:30:00.000Z");
  assert.equal(publicationDay("2026-11-13T20:30:00.000Z"), "2026-11-14");
  assert.equal(formatPublishedAt("2026-11-13T20:30:00.000Z"), "2026-11-14 04:30");
  assert.equal(formatPublishedAt("2026-11-12"), "2026-11-12");
  assert.deepEqual(publicationParts("2026-11-13T20:30:21Z"), { date: "2026-11-14", time: "04:30:21" });
  assert.deepEqual(publicationParts("2026-11-12"), { date: "2026-11-12", time: "" });
  for (const value of [17, "2026-02-30", "2026-11-14T08:30", "2026-11-14T24:00:00Z", "2026-11-14T08:60:00Z", "2026-11-14T08:30:60Z", "2026-11-14T08:30:00+25:00"]) assert.throws(() => readPublishedAt(value));
});

test("各类文档均保留首次发布时间，修改其他属性不改变时间或正文", () => {
  for (const type of ["note", "project", "graph", "roadmap", "diary", "page"] as const) {
    const raw = '\uFEFF---\r\n# 保留注释\r\npublication: published\r\npublishedAt: "2026-11-14T08:30:00+08:00"\r\ncustom: keep\r\n---\r\n保留正文\r\n';
    const parsed = parseMarkdownContent(raw, type);
    assert.equal(parsed.metadata.publishedAt, "2026-11-14T00:30:00.000Z");
    const next = serializeContentDocument({ ...parsed, type, frontmatterBlock: parsed.frontmatterBlock!, metadata: { ...parsed.metadata, publication: "draft" }, metadataDirty: true });
    assert.equal(parseMarkdownContent(next, type).metadata.publishedAt, parsed.metadata.publishedAt);
    assert.equal(parseMarkdownContent(createContentDraft(raw, type), type).metadata.publishedAt, undefined);
    assert.ok(next.startsWith('\uFEFF---\r\n# 保留注释'));
    assert.ok(next.includes('custom: keep'));
    assert.ok(next.endsWith('保留正文\r\n'));
  }
  const photo = { id: "test", title: "Test", alt: "Test", publication: "published", takenAt: "2020-01-01", publishedAt: "2026-11-14T08:30:00+08:00", images: [{ src: "https://example.com/image.webp", width: 10, height: 10 }] };
  assert.equal(parsePhotos([photo])[0].publishedAt, "2026-11-14T00:30:00.000Z");
  assert.equal(parsePhotos([photo])[0].takenAt, "2020-01-01");
  assert.throws(() => parsePhotos([{ ...photo, publishedAt: "bad" }]));
});
