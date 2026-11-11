import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownContent, serializeContentDocument, parseFrontmatter, parseArticleContentSegments, extractHeadingsFromContent } from "../packages/content-core/src/index";
import { createEmptyGraph } from "../packages/graph-core/src/index";
import { pathIdentity, renameSiblingPath } from "../packages/content-core/src/paths";
import { findGraphCodeBlocks } from "../packages/content-core/src/graph-blocks";

test("body-only editing preserves frontmatter comments, unknown fields, BOM and CRLF", () => {
  const raw = '\uFEFF---\r\n# keep me\r\ntitle: hello\r\ncustom: { retained: true }\r\n---\r\nbody\r\n';
  const parsed = parseMarkdownContent(raw, "note");
  const result = serializeContentDocument({ ...parsed, type: "note", frontmatterBlock: parsed.frontmatterBlock ?? undefined, metadataDirty: false });
  assert.equal(result, raw);
});

test("graph blocks respect outer Markdown fences and longer or tilde delimiters", () => {
  const text = '````markdown\n```graph\nnot graph\n```\n````\n~~~graph\n{"nodes":[]}\n~~~';
  const blocks = findGraphCodeBlocks(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].body.trim(), '{"nodes":[]}');
});

test("metadata editing retains YAML comments and unknown fields", () => {
  const raw = '---\n# keep me\ntitle: before\ncustom: { retained: true }\n---\nbody\n';
  const parsed = parseMarkdownContent(raw, "note");
  const result = serializeContentDocument({ ...parsed, type: "note", frontmatterBlock: parsed.frontmatterBlock ?? undefined, metadata: { ...parsed.metadata, title: "after" }, metadataDirty: true });
  assert.match(result, /# keep me/);
  assert.equal(parseFrontmatter(result, "note").data.title, "after");
  assert.deepEqual(parseFrontmatter(result, "note").data.custom, { retained: true });
});

test("invalid YAML remains available and cannot be silently replaced during metadata editing", () => {
  const raw = '---\ntitle: [broken\n---\nretained body\n';
  const parsed = parseMarkdownContent(raw, "note");
  assert.match(parsed.issues.join("\n"), /YAML/);
  assert.equal(parsed.content, "retained body\n");
  assert.throws(() => serializeContentDocument({ ...parsed, type: "note", frontmatterBlock: parsed.frontmatterBlock ?? undefined, metadataDirty: true }), /YAML/);
});

test("calendar dates remain strings and both content consumers receive identical data", () => {
  const raw = '---\ndate: 2026-04-03\ntitle: 中文\n---\nbody';
  assert.equal(parseFrontmatter(raw, "note").data.date, "2026-04-03");
  assert.equal((parseMarkdownContent(raw, "note").metadata as { date: string }).date, "2026-04-03");
});

test("article segmentation shares graph behavior across notes and diary and retains invalid input", () => {
  const valid = 'before\n\n```graph\n' + JSON.stringify(createEmptyGraph()) + '\n```\n\nafter';
  assert.deepEqual(parseArticleContentSegments(valid).map((segment) => segment.type), ["markdown", "graph", "markdown"]);
  const invalid = '```graph\n{"nodes":[],"edges":[]}\n```';
  const segments = parseArticleContentSegments(invalid);
  assert.equal(segments[0].type, "error");
  assert.equal("content" in segments[0] && segments[0].content, invalid);
});

test("heading extraction ignores code fences and disambiguates repeated labels", () => {
  const content = '## 标题\n```md\n## hidden\n```\n## 标题';
  assert.deepEqual(extractHeadingsFromContent(content).map((heading) => heading.id), ["标题", "标题-1"]);
});

test("document identities preserve Unix case and sibling renames reject directory input", () => {
  assert.notEqual(pathIdentity("/workspace/A.md"), pathIdentity("/workspace/a.md"));
  assert.equal(pathIdentity("C:\\Work\\A.md"), pathIdentity("c:/work/a.md"));
  assert.throws(() => renameSiblingPath("/workspace/a.md", "../b", ".md"), /文件名/);
  assert.equal(renameSiblingPath("/a.md", "b", ".md"), "/b.md");
});
