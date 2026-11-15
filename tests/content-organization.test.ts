import assert from "node:assert/strict";
import test from "node:test";
import { parseFriends, parseTemplateManifest, resolveCollectionItems, visibleFriends, type ContentCollection, type CollectionDocument } from "../packages/content-core/src/index";

const documents: CollectionDocument[] = [
  { type: "note", slug: "rule", title: "规则文章", category: "python", tags: ["基础"] },
  { type: "note", slug: "other", title: "其他文章", category: "go", tags: ["基础", "服务"] },
  { type: "project", slug: "manual", title: "手动项目", tags: ["基础"] },
];

test("栏目手动条目先按置顶和顺序排列，规则条目去重后追加", () => {
  const collection: ContentCollection = { id: "learn", slug: "learn", title: "学习", description: "", enabled: true, templateId: "article-list", pageSize: 12, rule: { tags: ["基础"], tagMode: "any" }, manualItems: [{ ref: { type: "note", slug: "other" }, pinned: false, order: 2 }, { ref: { type: "project", slug: "manual" }, pinned: true, order: 9 }] };
  assert.deepEqual(resolveCollectionItems(collection, documents).map((item) => item.slug), ["manual", "other", "rule"]);
});

test("友链校验重复标识并只公开已发布条目", () => {
  const friends = parseFriends([{ id: "a", name: "A", url: "https://a.example", description: "", order: 1, publication: "published" }, { id: "b", name: "B", url: "https://b.example", description: "", order: 0, publication: "draft" }]);
  assert.deepEqual(visibleFriends(friends).map((friend) => friend.id), ["a"]);
  assert.throws(() => parseFriends(friends.concat({ ...friends[0], id: "a" })), /重复/);
});

test("模板清单拒绝未声明的内容类型", () => {
  assert.throws(() => parseTemplateManifest({ version: 1, templates: [{ id: "bad", label: "坏模板", kind: "collection", contentTypes: ["unknown"], capabilities: {}, fields: [] }] }), /内容类型无效/);
});
