import assert from "node:assert/strict";
import test from "node:test";
import { assertNoteCategoryReferences, filterNotesByCategory, flattenNoteCategories, noteCategoryDescendants, noteCategoryPath, parseNoteCategories, parseMarkdownContent, serializeContentDocument, UNCATEGORIZED_NOTES, type NoteMetadata } from "../packages/content-core/src/index";

const categories = parseNoteCategories([
  { id: "math", name: "数学" },
  { id: "coding", name: "编程" },
  { id: "calculus", name: "高等数学", parentId: "math" },
  { id: "integral", name: "积分", parentId: "calculus" },
  { id: "linear", name: "线性代数", parentId: "math" },
]);

test("分类保持同级顺序，支持多级路径和整棵子树筛选", () => {
  assert.deepEqual(flattenNoteCategories(categories).map(({ id, depth }) => [id, depth]), [["math", 0], ["calculus", 1], ["integral", 2], ["linear", 1], ["coding", 0]]);
  assert.deepEqual(noteCategoryPath(categories, "integral").map(({ name }) => name), ["数学", "高等数学", "积分"]);
  assert.deepEqual([...noteCategoryDescendants(categories, "calculus")], ["calculus", "integral"]);
  const notes = [{ id: 1, category: "math" }, { id: 2, category: "integral" }, { id: 3, category: "coding" }, { id: 4 }];
  assert.deepEqual(filterNotesByCategory(notes, categories, "math").map(({ id }) => id), [1, 2]);
  assert.deepEqual(filterNotesByCategory(notes, categories, UNCATEGORIZED_NOTES).map(({ id }) => id), [4]);
  assert.deepEqual(filterNotesByCategory(notes, categories, "missing"), []);
  assert.deepEqual(filterNotesByCategory(notes, categories, ""), notes);
});

test("分类拒绝重复标识、悬空父级和循环嵌套，草稿保留尚未填写的名称", () => {
  for (const value of [null, {}, [{ id: "a", name: "A", extra: true }], [{ id: "../a", name: "A" }], [{ id: "a", name: "A" }, { id: "a", name: "B" }], [{ id: "a", name: "A", parentId: "missing" }], [{ id: "a", name: "A", parentId: "a" }], [{ id: "a", name: "A", parentId: "b" }, { id: "b", name: "B", parentId: "a" }]]) assert.throws(() => parseNoteCategories(value));
  assert.deepEqual(parseNoteCategories(undefined), []);
  assert.throws(() => parseNoteCategories([{ id: "a", name: " " }]));
  assert.equal(parseNoteCategories([{ id: "a", name: " " }], { draft: true })[0].name, " ");
});

test("分类改名和重新挂载不修改文档引用，删除仍被草稿引用的分类会报错", () => {
  const notes = [{ path: "content/notes/example.md", category: "integral" }];
  const changed = categories.map((category) => category.id === "integral" ? { ...category, name: "积分学习", parentId: "coding" } : category);
  assert.doesNotThrow(() => assertNoteCategoryReferences(changed, notes));
  assert.deepEqual(noteCategoryPath(changed, "integral").map(({ name }) => name), ["编程", "积分学习"]);
  assert.throws(() => assertNoteCategoryReferences(categories.filter(({ id }) => id !== "integral"), notes), /example\.md.*integral/);
});

test("设置和清除笔记分类保留正文、YAML 注释、未知字段和原始换行", () => {
  const raw = '\uFEFF---\r\n# 保留注释\r\ntitle: 示例\r\npublication: draft\r\ncustom: { keep: true }\r\n---\r\n保留正文\r\n';
  const parsed = parseMarkdownContent(raw, "note");
  const save = (metadata: NoteMetadata, source = parsed) => serializeContentDocument({ ...source, type: "note", frontmatterBlock: source.frontmatterBlock!, metadata, metadataDirty: true });
  const assigned = save({ ...parsed.metadata as NoteMetadata, category: "integral" });
  const next = parseMarkdownContent(assigned, "note");
  assert.equal((next.metadata as NoteMetadata).category, "integral");
  assert.ok(assigned.startsWith('\uFEFF---\r\n# 保留注释'));
  assert.ok(assigned.includes('custom: { keep: true }'));
  assert.ok(assigned.endsWith('保留正文\r\n'));
  assert.equal((parseMarkdownContent(save({ ...next.metadata as NoteMetadata, category: undefined }, next), "note").metadata as NoteMetadata).category, undefined);
  assert.match(parseMarkdownContent('---\npublication: draft\ncategory: [a]\n---\n正文', "note").issues.join(" "), /note.category/);
});
