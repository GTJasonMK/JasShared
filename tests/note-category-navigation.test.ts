import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UNCATEGORIZED_NOTES } from "../packages/content-core/src/index";
import { NoteCategoryNavigation } from "../packages/content-ui/src/NoteCategoryNavigation";

const categories = [
  { id: "math", name: "数学" },
  { id: "coding", name: "编程" },
  { id: "calculus", name: "高等数学", parentId: "math" },
  { id: "integral", name: "积分", parentId: "calculus" },
];
const render = (selected: string) => renderToStaticMarkup(createElement(NoteCategoryNavigation, { categories, selected, onChange: () => {} }));

test("分类目录按父子顺序嵌套，只选中当前分类，深层链接展开祖先", () => {
  const html = render("integral");
  const options = [...html.matchAll(/aria-pressed="(true|false)"[^>]*>([^<]*)<\/button>/g)];
  assert.deepEqual(options.map((match) => match[2]), ["全部笔记", "数学", "高等数学", "积分", "编程", "未分类"]);
  assert.deepEqual(options.filter((match) => match[1] === "true").map((match) => match[2]), ["积分"]);
  assert.match(html, /<ul[^>]*aria-label="数学的子分类"[^>]*><li>/);
  assert.match(html, /<ul[^>]*aria-label="高等数学的子分类"[^>]*><li>/);
  assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 2);
  assert.doesNotMatch(html, / hidden=/);
});

test("全部笔记和未分类各自只有一个选中项，默认收起分支", () => {
  for (const [selected, name] of [["", "全部笔记"], [UNCATEGORIZED_NOTES, "未分类"]]) {
    const html = render(selected);
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.match(html, new RegExp(`aria-pressed="true"[^>]*>${name}</button>`));
    assert.equal((html.match(/ hidden=/g) ?? []).length, 2);
    assert.doesNotMatch(html, /aria-expanded="true"/);
  }
  assert.doesNotMatch(render("missing"), /aria-pressed="true"/);
  assert.equal(renderToStaticMarkup(createElement(NoteCategoryNavigation, { categories: [], selected: "", onChange: () => {} })), "");
});
