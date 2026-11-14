import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { SECTION_IDS, parseMarkdownContent } from "../packages/content-core/src/index";
import { recordFirstPublications } from "../packages/site-tools/src/publication-time";
import { migrateWorkspace } from "../packages/site-tools/src/migrate";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jas-first-publication-"));
  const write = (relative: string, value: string) => { fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true }); fs.writeFileSync(path.join(root, relative), value); };
  const site = { name: "Test", description: "Test", footer: "Test", home: { motto: "Test", description: "" }, noteCategories: [], sections: Object.fromEntries(SECTION_IDS.map((id) => [id, { title: id, description: "", enabled: id !== "graphs" }])), navigation: [], comments: { enabled: false, repo: "", repoId: "", category: "", categoryId: "" } };
  write("content/site.json", JSON.stringify(site)); write("content/photography/photos.json", "[]");
  return { root, write, read: (relative: string) => fs.readFileSync(path.join(root, relative), "utf8"), cleanup: () => fs.rmSync(root, { recursive: true }) };
}

test("首次发布统一记录文档和摄影时间，普通更新、撤回再发布与重试不改时间", () => {
  const f = fixture();
  try {
    const raw = '\uFEFF---\r\n# keep\r\ntitle: Test\r\npublication: published\r\ncustom: keep\r\n---\r\nRetained body\r\n';
    f.write("content/notes/test.md", raw);
    f.write("content/notes/draft.md", raw.replace("published", "draft"));
    f.write("content/graphs/hidden.md", raw);
    f.write("content/pages/test.md", raw);
    f.write("content/photography/photos.json", JSON.stringify([{ id: "test", title: "Test", alt: "Test", publication: "published", takenAt: "2020-01-01", images: [{ src: "https://example.com/photo.webp", width: 10, height: 10 }] }]));
    const stamp = "2026-11-14T01:02:03.000Z";
    assert.deepEqual(recordFirstPublications(f.root, stamp).sort(), ["content/notes/test.md", "content/pages/test.md", "content/photography/photos.json"]);
    assert.equal(parseMarkdownContent(f.read("content/notes/test.md"), "note").metadata.publishedAt, stamp);
    assert.ok(f.read("content/notes/test.md").endsWith("Retained body\r\n"));
    assert.equal(f.read("content/notes/draft.md"), raw.replace("published", "draft"));
    assert.equal(f.read("content/graphs/hidden.md"), raw);
    assert.equal(JSON.parse(f.read("content/photography/photos.json"))[0].takenAt, "2020-01-01");
    assert.deepEqual(recordFirstPublications(f.root, "2027-01-01T00:00:00Z"), []);
    f.write("content/notes/test.md", f.read("content/notes/test.md").replace("publication: published", "publication: draft"));
    assert.deepEqual(recordFirstPublications(f.root), []);
    f.write("content/notes/test.md", f.read("content/notes/test.md").replace("publication: draft", "publication: published").replace("Retained body", "Edited body"));
    assert.deepEqual(recordFirstPublications(f.root), []);
    assert.equal(parseMarkdownContent(f.read("content/notes/test.md"), "note").metadata.publishedAt, stamp);
  } finally { f.cleanup(); }
});

test("历史迁移只用原有日期，不用拍摄日期或文件时间伪造发布时间，重复迁移不改正文", async () => {
  const f = fixture(); const backup = fs.mkdtempSync(path.join(os.tmpdir(), "jas-publish-time-backup-"));
  try {
    const raw = '\uFEFF---\r\n# keep\r\ntitle: Test\r\npublication: published\r\ndate: 2020-02-29\r\ncustom: keep\r\n---\r\nRetained body\r\n';
    f.write("content/notes/history.md", raw);
    f.write("content/pages/unknown.md", "---\ntitle: Unknown\npublication: published\n---\nRetained body\n");
    f.write("content/notes/draft.md", raw.replace("published", "draft"));
    await migrateWorkspace(f.root, backup);
    assert.equal(parseMarkdownContent(f.read("content/notes/history.md"), "note").metadata.publishedAt, "2020-02-29");
    assert.equal(parseMarkdownContent(f.read("content/pages/unknown.md"), "page").metadata.publishedAt, undefined);
    assert.equal(parseMarkdownContent(f.read("content/notes/draft.md"), "note").metadata.publishedAt, undefined);
    assert.equal(fs.readFileSync(path.join(backup, "content/notes/history.md"), "utf8"), raw);
    assert.ok(f.read("content/notes/history.md").endsWith("Retained body\r\n"));
    assert.deepEqual(await migrateWorkspace(f.root, backup), []);
  } finally { f.cleanup(); fs.rmSync(backup, { recursive: true }); }
});
