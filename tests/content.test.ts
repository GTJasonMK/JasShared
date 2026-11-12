import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownContent, serializeContentDocument, createContentDraft, extractHeadingsFromContent } from "../packages/content-core/src/index";
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
  assert.equal(parseMarkdownContent(result, "note").frontmatterRaw.title, "after");
  assert.deepEqual(parseMarkdownContent(result, "note").frontmatterRaw.custom, { retained: true });
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
  assert.equal(parseMarkdownContent(raw, "note").frontmatterRaw.date, "2026-04-03");
  assert.equal((parseMarkdownContent(raw, "note").metadata as { date: string }).date, "2026-04-03");
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

test('plain docs preserve their format and persist date-only metadata edits', () => {
  const parsed = parseMarkdownContent('plain\n', 'doc');
  assert.equal(serializeContentDocument({ ...parsed, type: 'doc', frontmatterBlock: undefined, metadataDirty: false }), 'plain\n');
  const saved = serializeContentDocument({ ...parsed, type: 'doc', frontmatterBlock: undefined, metadata: { title: '', date: '2026-11-12' }, metadataDirty: true });
  assert.equal(parseMarkdownContent(saved, 'doc').frontmatterRaw.date, '2026-11-12');
  const existing = parseMarkdownContent('---\n# retained\ntitle: before\ncustom: yes\n---\nbody', 'doc');
  const edited = serializeContentDocument({ ...existing, type: 'doc', frontmatterBlock: existing.frontmatterBlock ?? undefined, metadata: { title: 'after' }, metadataDirty: true });
  assert.match(edited, /# retained/);
  assert.equal(parseMarkdownContent(edited, 'doc').frontmatterRaw.custom, 'yes');
});

test('创建草稿只改变发布状态，不将坏字段静默替换为空值', () => {
  const raw = '---\npublication: published\ntitle: { creative: retained }\ntags: wrong-format\n---\nbody\n';
  const draft = parseMarkdownContent(createContentDraft(raw, 'note'), 'note');
  assert.equal(draft.metadata.publication, 'draft');
  assert.deepEqual(draft.frontmatterRaw.title, { creative: 'retained' });
  assert.equal(draft.frontmatterRaw.tags, 'wrong-format');
  assert.equal(draft.content, 'body\n');
  assert.match(draft.issues.join(' '), /title.*tags/);
});

test('编辑其他属性时保留坏字段，避免丢失尚未修复的创作数据', () => {
  const parsed = parseMarkdownContent('---\npublication: published\ntitle: { retained: creative-value }\ntags: [before]\ncustom: yes\n---\nbody', 'note');
  const saved = serializeContentDocument({ ...parsed, type: 'note', frontmatterBlock: parsed.frontmatterBlock!, metadata: { ...parsed.metadata, tags: ['after'] }, metadataDirty: true });
  const after = parseMarkdownContent(saved, 'note');
  assert.deepEqual(after.frontmatterRaw.title, { retained: 'creative-value' });
  assert.deepEqual(after.frontmatterRaw.tags, ['after']);
  assert.equal(after.frontmatterRaw.custom, 'yes');
  assert.match(after.issues.join(' '), /title/);
});
