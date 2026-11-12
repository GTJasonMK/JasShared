import assert from "node:assert/strict";
import test from "node:test";
import { inferDiaryFromFileName, resolveDiaryDate } from "../packages/content-core/src/diary-contract";
import { normalizeContentMetadata, parseMarkdownContent } from "../packages/content-core/src/content-parser";
import { FRONTMATTER_HELP_EXAMPLES } from "../packages/content-core/src/writing-guide";

test("当前内容合同拒绝字符串数组、旧名称别名和不规范的日期时间", () => {
  const cases = [
    { type: "note" as const, fields: { title: "Synthetic", tags: "one,two" }, field: "tags" },
    { type: "note" as const, fields: { title: "Synthetic", tags: ["one", { secret: "retained" }] }, field: "tags" },
    { type: "project" as const, fields: { name: "Synthetic", techStack: "React,TypeScript" }, field: "techStack" },
    { type: "project" as const, fields: { name: "Synthetic", techStack: ["React"] }, field: "techStack" },
    { type: "project" as const, fields: { title: "Legacy name" }, field: "title" },
    { type: "graph" as const, fields: { title: "Legacy name" }, field: "title" },
    { type: "roadmap" as const, fields: { name: "Legacy name" }, field: "name" },
    { type: "note" as const, fields: { title: "Synthetic", date: 20261112 }, field: "date" },
    { type: "diary" as const, fields: { title: "Synthetic", date: "2026-02-30", time: "09:00" }, field: "date" },
    { type: "diary" as const, fields: { title: "Synthetic", date: "2026-11-12", time: "0900" }, field: "time" },
    { type: "roadmap" as const, fields: { title: "Synthetic", status: "archived" }, field: "status" },
  ];
  for (const { type, fields, field } of cases) {
    const parsed = normalizeContentMetadata({ publication: "published", ...fields }, type);
    assert.match(parsed.issues.join("\n"), new RegExp(field), `${type}.${field} 必须明确报错`);
    assert.equal(parsed.metadata.publication, "published", "其他字段错误不能把公开状态改成草稿");
  }
});

test("正文及原始 YAML 在字段校验失败时仍然保留", () => {
  const raw = '---\ntitle: Synthetic\npublication: published\ntags: one,two\ncustom: retained\n---\nCreative body\n';
  const parsed = parseMarkdownContent(raw, "note");
  assert.match(parsed.issues.join("\n"), /tags/);
  assert.equal(parsed.frontmatterRaw.tags, "one,two");
  assert.equal(parsed.frontmatterRaw.custom, "retained");
  assert.equal(parsed.content, "Creative body\n");
});

test("展示配置错误独立报错，不覆盖合法的发布状态", () => {
  const parsed = normalizeContentMetadata({ title: "Synthetic", publication: "published", display: { toc: "yes" } }, "note");
  assert.match(parsed.issues.join("\n"), /toc/);
  assert.equal(parsed.metadata.publication, "published");
});
test("日志文件名推断验证真实日期和时间，缺少时间保留为空", () => {
  assert.equal(inferDiaryFromFileName("2026-02-30"), null);
  assert.equal(inferDiaryFromFileName("2026-11-12")?.time, "");
  assert.throws(() => inferDiaryFromFileName("2026-11-12-25-00"), /HH:MM/);
  assert.throws(() => resolveDiaryDate("2026-02-30", "2026-11-12"), /日期/);
});

test("内置完整写作示例均符合当前内容合同", () => {
  for (const example of FRONTMATTER_HELP_EXAMPLES) assert.deepEqual(parseMarkdownContent(example.raw, example.type).issues, [], example.id);
});
