import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

const DIARY_RAW = `---
title: 4 月冲刺阶段复盘
date: 2026-04-03
time: 22:10
excerpt: 今天完成英语真题两篇、政治选择题复盘，并整理了错题原因。
tags: [考研, 英语, 政治]
mood: steady
weather: cloudy
location: library
companions: [solo]
---

## 今日目标

- 完成英语阅读 2 篇
- 复盘政治 1000 题错题
- 整理明天要背的专业课提纲

## 完成情况

1. 英语阅读按时完成，第二篇正确率偏低。
2. 政治错题主要集中在马原概念混淆。
3. 专业课提纲只整理到一半，需要明天补完。

## 问题复盘

- 英语阅读失分点：定位句太慢，选项比对不够果断。
- 政治复盘方式还可以更结构化，明天开始按知识点分类。
- 晚上回看了 [React 状态同步排查笔记](/notes/react-state-sync)，准备把里面的“状态源头单一化”思路套到自己的复盘流程里。
- 同时对照了 [状态流转图谱](/graphs/state-flow)，重新整理了今天做题 -> 订正 -> 复盘的步骤关系。
- 晚上状态下滑明显，21:30 后不适合继续做新题。

## 明日安排

- 早上背政治高频概念 30 分钟
- 下午补完专业课提纲
- 晚上只做错题回顾，不再新开套题`;

export const FRONTMATTER_DIARY_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "frontmatter-diary",
  navTitle: "diary 写法",
  title: "diary（考研日志）",
  type: "diary",
  description:
    "适合记录当天目标、完成情况与复盘。最常见结构是目标 -> 完成情况 -> 问题复盘 -> 明日安排。",
  suitableFor:
    "当你需要按时间连续记录学习进度，并希望后续按天或按阶段回看状态变化时，diary 是最适合的类型。",
  commonPatterns: [
    "详情页是朴素的文章流式布局：顶部朱砂色大号日期 + 年月做视觉锚点，标题紧随其下，mood 用金色胶囊标签；多条记录用云纹分隔线隔开——像翻看一本日记本。",
    "frontmatter 里补齐 `date/time/excerpt/tags`，方便时间线与列表页读取。",
    "正文先写 `今日目标`，再写 `完成情况`，这样复盘时能直接对照计划与结果。",
    "把当天最重要的失分点、拖延点或调整策略收敛到 `问题复盘`，方便后续按周总结。",
  ],
  writingTips: [
    "日记标题可以是主题化标题，不一定非要和日期重复；日期信息已经由 frontmatter 承担。",
    "如果一天有多条记录，建议 `excerpt` 只写最能代表该条内容的一句话，避免时间线里信息噪声过大。",
    "情绪、天气、地点这些字段适合用来做复盘上下文，不要把当天所有细节都塞进 frontmatter。",
    "需要联动学习笔记或知识图谱时，正文直接写标准 Markdown 内链，发布站点会渲染为可点击跳转的链接。",
  ],
  raw: DIARY_RAW,
  scenarioExamples: [
    {
      id: "diary-path-pattern",
      title: "文件路径与文件名",
      description:
        "考研日志默认放在 `content/diary/YYYY/MM/` 下面，文件名推荐直接带上记录时间。",
      code: `content/diary/2026/04/2026-04-03-09-00-morning-plan.md
content/diary/2026/04/2026-04-03-21-30-night-review.md
content/diary/2026/04/2026-04-04.md`,
      notes: [
        "推荐格式是 `YYYY/MM/YYYY-MM-DD-HH-mm-主题.md`，这样列表、搜索和聚合都更稳定。",
        "如果只写到天，文件名也可以是 `YYYY-MM-DD.md`，时间会回退为 `00:00`。",
        "编辑器“新建考研日志”默认就会生成带年月目录和时间戳的相对路径。",
      ],
    },
    {
      id: "diary-multi-entry",
      title: "同一天多条记录",
      description:
        "同一天想记上午、下午、晚上三段内容时，不是写进一个文件里，而是创建多个 diary 文件，使用相同 `date`、不同 `time`。",
      code: `# 上午记录
---
date: 2026-04-03
time: 09:00
title: 上午刷题计划
---

# 晚上记录
---
date: 2026-04-03
time: 21:30
title: 晚上复盘总结
---`,
      notes: [
        "站点会把同一天的多篇 diary 聚合到同一个详情页，并按时间顺序显示。",
        "关键是 `date` 保持同一天、`time` 区分时段；文件名最好也同步带上时间，方便在目录里辨认。",
        "如果你只改了标题、不写时间，页面仍能显示，但同日多条的时间层级会变弱。",
      ],
    },
    {
      id: "diary-reference-links",
      title: "引用笔记与图谱",
      description:
        "diary 里引用学习笔记和知识图谱时，直接写标准 Markdown 链接，不需要自定义语法。",
      code: `今天复盘了 [React 状态同步排查笔记](/notes/react-state-sync)，
又对照了 [状态流转图谱](/graphs/state-flow)，
准备把里面的拆解方式套到明天的错题整理里。`,
      notes: [
        "diary 正文里的 `/notes/<slug>`、`/graphs/<slug>` 链接会被渲染为标准超链接，点击后跳转到对应页面。",
        "链接写法和普通 Markdown 内链完全一致，不需要自定义语法。",
        "如果链接 slug 写错，发布站点会显式提示未找到对应内容，而不是静默失败。",
      ],
    },
    {
      id: "diary-context-fields",
      title: "复盘上下文字段",
      description:
        "当你想一起记录当天状态和学习环境时，可以补 `mood/weather/location/companions` 这些字段。",
      code: `---
date: 2026-04-03
time: 0900
title: 上午图书馆刷题记录
mood: focused
weather: sunny
location: library
companions: 学习搭子A、学习搭子B
---

## 完成情况

- 英语阅读 2 篇
- 政治错题复盘 1 小时`,
      notes: [
        "`mood/weather/location` 会出现在列表和详情头部，用来标记当天状态和环境。",
        "`companions` 既可以写 YAML 数组，也兼容逗号、顿号分隔字符串。",
        "同一天多条 diary 聚合时，页面会优先取当天最新一条非空的 mood/weather/location。",
      ],
    },
    {
      id: "diary-not-suitable",
      title: "什么时候不该写成 diary",
      description:
        "如果内容脱离当天学习进度，变成完整教程、长期说明或系统总结，就不该继续写成 diary。",
      code: `## 现象分析

- 对比了三种状态同步方案
- 总结了 store 与局部状态的边界
- 给出长期维护建议

## 推荐改写

- 问题总结与结论：改成 note
- 团队流程说明：改成 doc
- 概念关系梳理：改成 graph`,
      notes: [
        "diary 的核心是“这一天发生了什么、完成了什么、接下来怎么调”。",
        "一旦正文脱离时间线，改成 note/doc/graph 会更利于检索、引用和后续维护。",
      ],
    },
  ],
};
