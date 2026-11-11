import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

const DOC_RAW = `---
title: 编辑器帮助页维护说明
date: 2026-04-03
---

## 适用范围

这类 doc 适合写通用说明、操作流程、内部规范，不要求站点卡片化展示。

## 操作步骤

1. 先更新 frontmatter 示例文档。
2. 再检查对应预览是否仍与站点一致。
3. 最后运行测试与构建验证。

## 注意事项

- \`doc\` 类型可以没有 frontmatter，但有标题和日期时更利于整理。
- 当内容偏教程或总结时，也可以考虑改写为 note。`;

export const FRONTMATTER_DOC_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "frontmatter-doc",
  navTitle: "doc 写法",
  title: "doc（普通文档）",
  type: "doc",
  description:
    "适合说明文、规范文档和内部手册。最常见结构是适用范围 -> 操作步骤 -> 注意事项。",
  suitableFor:
    "当内容主要面向本地编辑、团队协作或流程说明，而不依赖站点的内容卡片体系时，doc 是最直接、约束最少的类型。",
  commonPatterns: [
    "doc 可以不写 frontmatter，但如果文档会长期维护，建议至少保留 `title/date`，便于归档和回看。",
    "正文优先围绕使用场景与步骤展开，而不是像 project 一样强调对外展示信息。",
    "如果文档本质是内部规范，使用 `适用范围 -> 操作步骤 -> 注意事项` 会比散文式写法更稳定。",
  ],
  writingTips: [
    "一份 doc 只解决一件事，避免把规范、复盘、教程和决策记录都混在同一篇里。",
    "如果文档更偏知识沉淀或问题总结，改写成 note 往往更适合后续检索与引用。",
    "步骤型文档尽量使用编号列表，后续增删步骤时 diff 更清晰。",
  ],
  raw: DOC_RAW,
  scenarioExamples: [
    {
      id: "doc-no-frontmatter",
      title: "无 frontmatter 的普通文档",
      description:
        "doc 是最宽松的类型，内部流程说明可以直接从正文开始写，不强制要求 YAML 头。",
      code: `# 发布前检查清单

## 操作步骤

1. 运行测试
2. 确认帮助页示例预览正常
3. 再执行构建`,
      notes: [
        "这种写法适合临时说明和纯内部文档，不需要额外维护元数据。",
        "如果这篇文档会长期保留，仍然建议补上 `title/date`，方便后续检索和归档。",
      ],
    },
    {
      id: "doc-with-frontmatter",
      title: "带 frontmatter 的说明文档",
      description:
        "当文档会长期维护或需要稳定标题时，可以像 note 一样补一个很小的 frontmatter。",
      code: `---
title: 编辑器发布流程
date: 2026-04-03
---

## 适用范围

适用于本地联调完成后的发布前检查。`,
      notes: [
        "doc 的 frontmatter 不需要写很多字段，最常见就是 `title/date`。",
        "如果内容开始出现大量背景分析和结论总结，就说明它可能更适合改成 note。",
      ],
    },
    {
      id: "doc-vs-note",
      title: "什么时候该改写成 note",
      description:
        "如果文档开始强调结论、根因、经验总结，而不是固定步骤和适用范围，就该从 doc 改成 note。",
      code: `---
title: 状态同步问题复盘
date: 2026-04-03
---

## 问题背景

预览区与工具栏状态不同步。

## 核心结论

- 重复状态是根因
- 收敛到单一 store 后问题消失`,
      notes: [
        "这类内容读者更关心结论和分析路径，note 的结构比 doc 更自然。",
        "判断标准很简单：如果文档主要回答“为什么”和“学到了什么”，就更接近 note。",
      ],
    },
  ],
};
