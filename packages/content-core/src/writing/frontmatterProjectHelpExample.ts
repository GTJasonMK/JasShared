import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

const PROJECT_RAW = `---
name: JasBlogEditor
description: 用于本地编辑 JasBlog 内容并交给 GitHub Pages 自动部署的桌面编辑器。
github: https://github.com/your-name/JasBlogEditor
demo: https://example.com/editor-preview
date: 2026-04-03
tags: [tauri, react, markdown]
techStack:
  - name: Tauri 2
    icon: Tauri
  - name: React 19
    icon: React
  - name: TypeScript
    icon: TS
---

## 项目定位

JasBlogEditor 的目标不是做通用笔记软件，而是围绕 JasBlog 内容契约提供“编辑、预览、发布前自检”的专用工作流。

## 功能亮点

- 与 JasBlog 内容目录对齐，直接编辑 \`content/\` 下的 Markdown 文件
- 内置 roadmap / graph / frontmatter 帮助示例，减少写作试错
- 本地保存后即可提交到 GitHub，由 GitHub Pages 自动部署

## 使用方式

\`\`\`bash
npm run dev:app
\`\`\`

启动后先选择 JasBlog 工作区，再按内容类型新建或编辑文档。

## 后续计划

- 完善帮助页示例文档
- 继续统一编辑器与站点解析行为`;

export const FRONTMATTER_PROJECT_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "frontmatter-project",
  navTitle: "project 写法",
  title: "project（项目介绍）",
  type: "project",
  description:
    "适合写项目定位、亮点、技术栈与使用方式。最常见结构是定位 -> 亮点 -> 使用方式 -> 后续计划。",
  suitableFor:
    "当文档要被项目列表和详情页同时消费时，project 应该优先突出“这个项目是什么、解决什么问题、怎么试用”。",
  commonPatterns: [
    "详情页顶部是圆角展台卡片：最顶端一条墨色细线标识项目类型，下方纸色区域放金色「开源项目」标签、标题、描述、墨色 GitHub 按钮与技术栈标签——像轻量的产品信息展板。",
    "frontmatter 里的 `name/description/github` 会影响 Hero 区信息，建议写得简洁、可读。",
    "正文第一段先说明项目定位，避免一上来堆实现细节或开发故事。",
    "功能亮点用列表最清晰；技术栈放在 `techStack`，不要在正文重复罗列一遍相同信息。",
  ],
  writingTips: [
    "如果项目还没有 demo，宁可省略 `demo` 字段，也不要写无效占位链接。",
    "功能亮点只保留用户感知最强的 3-5 条，避免把开发待办写进展示文档。",
    "项目页正文更适合写“为什么做”和“怎么使用”，实现细节可以拆到 note 或 doc。",
  ],
  raw: PROJECT_RAW,
  scenarioExamples: [
    {
      id: "project-minimal-card",
      title: "最小项目卡片",
      description:
        "如果你只是想先把项目挂到列表页，最少写 `name/description/github` 就够用。",
      code: `---
name: JasBlogEditor
description: 面向 JasBlog 工作流的本地内容编辑器。
github: https://github.com/your-name/JasBlogEditor
tags: [tauri, markdown]
---

## 项目定位

一句话说明这个项目解决什么问题。`,
      notes: [
        "这类写法适合刚起步的项目，先保证卡片可读，再逐步补正文。",
        "没有 demo 时直接省略 `demo`；不要为了页面完整感去写空链接。",
      ],
    },
    {
      id: "project-tech-stack",
      title: "结构化技术栈",
      description:
        "当你希望项目页展示技术标签时，用 `techStack` 数组表达，而不是把技术名散落在正文里。",
      code: `techStack:
  - name: Tauri 2
    icon: Tauri
  - name: React 19
    icon: React
  - name: TypeScript
    icon: TS`,
      notes: [
        "`techStack` 适合放稳定的核心技术，不适合把每个依赖都写进去。",
        "`icon/color` 只写字符串；如果没有必要，不必额外指定颜色，让站点和编辑器按默认契约渲染。",
      ],
    },
    {
      id: "project-tech-stack-string",
      title: "逗号分隔技术栈",
      description:
        "如果你只是想快速起稿，也可以先把 `techStack` 写成逗号分隔字符串，解析器会自动拆分。",
      code: `---
name: JasBlogEditor
description: 面向 JasBlog 的本地编辑器
github: https://github.com/your-name/JasBlogEditor
techStack: React, Tauri, TypeScript
---`,
      notes: [
        "这是兼容写法，适合先把项目信息写出来；长期维护更推荐结构化数组，便于补 icon 和 color。",
        "拆分后会按技术名生成标签，但不会自动补图标或颜色等附加字段。",
      ],
    },
    {
      id: "project-no-demo",
      title: "无 demo 的项目写法",
      description:
        "项目暂时没有在线演示时，直接省略 `demo` 字段即可，不需要用占位链接凑完整。",
      code: `---
name: JasBlogEditor
description: 用于本地编辑 JasBlog 内容的桌面工具。
github: https://github.com/your-name/JasBlogEditor
tags: [tauri, react]
---

## 功能亮点

- 本地编辑 Markdown
- 与发布站点契约对齐
- 保存后可直接提交部署`,
      notes: [
        "站点只会在 `demo` 是有效非空字符串时渲染对应按钮，空白值会按缺失处理。",
        "如果项目还在开发中，正文里写清当前可试用方式，比放一个无效 demo 更诚实。",
      ],
    },
  ],
};
