import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

const ROADMAP_RAW = `---
title: 帮助页写作指南完善计划
description: 为 frontmatter 分类补齐各类文档的完整示例与写作说明
status: active
date: 2026-04-03
---

先说明这个 roadmap 想解决什么，再列出任务。非任务文本会保留在正文区。

## 任务列表

- [-] 明确帮助页结构 \`high\`
  描述: 确定 frontmatter 分类下需要展示哪些文档类型与说明层级
  详情:
    - 保留字段矩阵速查
    - 增加写作通用规则
    - 每类文档提供完整示例与写作建议

- [ ] 抽离 frontmatter 示例模块 \`high\`
  描述: 将各类示例内容从 HelpModal 拆到独立文件，降低维护成本
  截止: 2026-04-05

- [ ] 补充帮助页回归测试 \`medium\`
  描述: 锁定章节目录与示例内容，避免后续改动时退化`;

export const FRONTMATTER_ROADMAP_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "frontmatter-roadmap",
  navTitle: "roadmap 写法",
  title: "roadmap（规划文档）",
  type: "roadmap",
  description:
    "适合管理阶段目标和任务分解。最常见结构是先写规划说明，再用任务列表表达执行项。",
  suitableFor:
    "当你需要同时表达“为什么做这个计划”和“当前有哪些可执行任务”时，roadmap 最适合。正文说明和任务卡片会一起构成完整计划。",
  commonPatterns: [
    "详情页是一张圆角仪表盘卡片：顶部有一条从朱砂红渐变到金色的细横线，标题前有状态指示灯（进行中=朱砂色呼吸动画，已完成=绿色，已暂停=灰色），进度条下方显示三色图例与计数——像看板仪表盘的控制面板。",
    "frontmatter 负责计划标题、总描述与状态；任务明细放在正文里，用任务语法表达。",
    "正文开头先写一段规划说明，交代背景、目标或阶段边界，再进入任务列表。",
    "任务优先级写在行末反引号里，例如 `- [ ] 任务标题 `high``，不要写到标题前面。",
  ],
  writingTips: [
    "每个任务的 `描述` 建议只写一句话，真正的背景和限制放到 `详情` 下。",
    "如果任务没有明确结束时间，可以省略 `截止`，不要为了填字段而写虚假的日期。",
    "roadmap 适合看阶段推进，不适合记录长篇复盘；复盘更适合写成 note 或 diary。",
  ],
  raw: ROADMAP_RAW,
  scenarioExamples: [
    {
      id: "roadmap-minimal-task",
      title: "最小任务语法",
      description:
        "先掌握任务行本身的写法，再逐步补充描述、截止日期和详情。",
      code: `- [ ] 任务标题 \`high\`
- [-] 进行中的任务 \`medium\`
- [x] 已完成的任务 \`low\``,
      notes: [
        "优先级只能写在标题尾部的反引号里，不能写到标题前面。",
        "列表前缀可以是 `-`、`*`、`+`，但建议统一使用 `-`，减少 diff 噪声。",
      ],
    },
    {
      id: "roadmap-task-details",
      title: "带描述与截止的任务",
      description:
        "任务需要补充说明时，把元数据写在下一行，并保持至少两个空格缩进。",
      code: `- [ ] 补齐帮助页示例 \`high\`
  描述: 给每类文档增加可直接照抄的场景示例
  截止: 2026-04-05
  详情:
    - note 增加两种正文结构
    - roadmap 增加最小任务语法
    - graph 增加最小可渲染图谱`,
      notes: [
        "`描述`、`截止`、`详情` 这些任务字段必须缩进至少两个空格，不要只缩进一个 Tab。",
        "说明型段落可以继续写在任务列表前后，roadmap 不要求整篇文档都必须是任务。",
      ],
    },
    {
      id: "roadmap-prefix-compatibility",
      title: "前缀兼容写法",
      description:
        "解析器支持 `-`、`*`、`+` 三种列表前缀，但优先级和状态语法保持完全相同。",
      code: `- [ ] 默认写法 \`high\`
* [-] 星号前缀也能识别 \`medium\`
+ [x] 加号前缀同样有效 \`low\``,
      notes: [
        "三种前缀都能被识别为 roadmap 任务项，不会影响状态与优先级解析。",
        "为了减少版本控制噪声，团队内部最好统一使用 `-` 作为默认前缀。",
      ],
    },
    {
      id: "roadmap-invalid-indent",
      title: "错误缩进与优先级",
      description:
        "最容易写错的是把优先级放到标题前，或者让任务详情只缩进一个 Tab。",
      code: `- [ ] \`high\` 错误的优先级位置
\t截止: 2026-04-05

- [ ] 正确写法 \`high\`
  截止: 2026-04-05`,
      notes: [
        "优先级必须尾置在任务标题后面；写到标题前会被当成正文的一部分。",
        "任务详情字段要求至少两个空白字符缩进；单个 Tab 在站点不会按合法详情解析。",
      ],
    },
  ],
};
