import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

const GRAPH_RAW = `---
publication: draft
name: 前端渲染能力图谱
description: 用图谱梳理 Markdown 渲染、frontmatter 与特殊块语法之间的关系
date: 2026-04-03
---

先用一段文字说明图谱想表达什么，再给出 \`graph\` 代码块，是图谱类文档最常见的写法。

\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [
    {
      "id": "frontmatter",
      "type": "knowledgeNode",
      "position": {
        "x": 80,
        "y": 80
      },
      "data": {
        "label": "Frontmatter",
        "content": "",
        "tags": [
          "元数据"
        ],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000,
        "color": "blue",
        "edgeColor": "p1"
      }
    },
    {
      "id": "body",
      "type": "knowledgeNode",
      "position": {
        "x": 340,
        "y": 80
      },
      "data": {
        "label": "正文内容",
        "content": "",
        "tags": [
          "Markdown"
        ],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000,
        "color": "green"
      }
    },
    {
      "id": "preview",
      "type": "knowledgeNode",
      "position": {
        "x": 220,
        "y": 240
      },
      "data": {
        "label": "预览结果",
        "content": "",
        "tags": [
          "渲染"
        ],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000,
        "color": "orange"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "frontmatter",
      "target": "preview",
      "label": "影响头部信息"
    },
    {
      "id": "e2",
      "source": "body",
      "target": "preview",
      "label": "影响正文渲染"
    }
  ]
}
\`\`\`

## 阅读提示

- 蓝色节点表示元数据层
- 绿色节点表示正文渲染层
- 连线表示谁影响谁`;

export const FRONTMATTER_GRAPH_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "frontmatter-graph",
  navTitle: "graph 写法",
  title: "graph（图谱文档）",
  type: "graph",
  description:
    "适合用图结构解释概念关系。最常见结构是先说明图谱主题，再给出 `graph` 代码块与阅读提示。",
  suitableFor:
    "当你要表达节点之间的关系、层级或依赖，而不是线性步骤时，graph 比普通文档更直观。它适合知识结构、系统关系和概念网络。",
  commonPatterns: [
    "详情页顶部是暖纸色圆角卡片，金色虚线边框暗示节点连接关系，金色/朱砂色边条的统计卡片分别展示节点数和连接数——与其他类型的实线边框形成差异。",
    "frontmatter 只概括图谱主题与说明，真正的图结构放在正文中的第一个 `graph` 代码块里。",
    "图谱前先用 1-2 段文字说明读图方式，帮助读者理解颜色、节点类别或连线含义。",
    "图谱后补一个 `阅读提示` 或 `如何使用` 小节，说明哪些节点最关键、如何从图中过渡到正文。",
  ],
  writingTips: [
    "JSON 至少保证 `nodes/edges` 结构正确，避免把帮助页示例写成无法渲染的图谱。",
    "节点标签保持短句，不要把整段说明塞进 `label`，复杂解释应放在正文。",
    "如果图谱内容本身就很复杂，正文应先给阅读入口，不要让用户一打开就直接面对大图。",
  ],
  raw: GRAPH_RAW,
  scenarioExamples: [
    {
      id: "graph-minimal",
      title: "最小可渲染图谱",
      description:
        "先从一个最小的 `nodes/edges` 结构开始，比一上来堆很多节点更稳。",
      code: `\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [
    {
      "id": "plan",
      "type": "knowledgeNode",
      "position": {
        "x": 80,
        "y": 100
      },
      "data": {
        "label": "计划",
        "content": "",
        "tags": [],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000
      }
    },
    {
      "id": "review",
      "type": "knowledgeNode",
      "position": {
        "x": 260,
        "y": 100
      },
      "data": {
        "label": "复盘",
        "content": "",
        "tags": [],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "plan",
      "target": "review",
      "label": "完成后进入"
    }
  ]
}
\`\`\``,
      notes: [
        "只要 `JSON.parse` 成功且有合法的 `nodes/edges` 结构，就能进入图谱渲染流程。",
        "刚开始写 graph 时，先保证结构对，再逐步补颜色、标签和说明文字。",
      ],
    },
    {
      id: "graph-context",
      title: "图谱前后的说明正文",
      description:
        "graph 不应该只有一个代码块；正文应该先说明图谱意图，再给读图提示。",
      code: `这张图谱用来梳理“计划 -> 执行 -> 复盘”的关系。

\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [],
  "edges": []
}
\`\`\`

## 阅读提示

- 先看主干流程
- 再看每个节点的标签说明`,
      notes: [
        "用户打开图谱文档时，通常需要先知道“这张图为什么存在”，正文说明就是这个入口。",
        "如果一个页面里写了多个 `graph` 代码块，文档主图始终使用第一块；第一块有错误时需要先修复。",
      ],
    },
    {
      id: "graph-first-valid-block",
      title: "第一块 graph 代码块",
      description:
        "graph 文档使用第一块作为主图；该块无效时显示错误并保留原文。",
      code: `## 草稿

\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [
    {
      "id": "first",
      "type": "knowledgeNode",
      "position": {
        "x": 100,
        "y": 100
      },
      "data": {
        "label": "第一张有效图",
        "content": "",
        "tags": [],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000
      }
    }
  ],
  "edges": []
}
\`\`\`

\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [],
  "edges": []
}
\`\`\``,
      notes: [
        "编辑和排查时应把要展示的图谱放在第一块 `graph` 代码块里。",
        "后续图谱可以作为草稿保留；第一块错误时不会跳过它渲染后续图谱。",
      ],
    },
    {
      id: "graph-invalid-json-shape",
      title: "错误 JSON 与错误结构",
      description:
        "graph 代码块有两类常见错误：JSON 本身无法解析，或结构合法但缺少 `nodes/edges`。",
      code: `\`\`\`graph
{ invalid json }
\`\`\`

\`\`\`graph
{
  "items": []
}
\`\`\``,
      notes: [
        "第一类错误会直接暴露 JSON 解析失败信息，方便你回到源码修正。",
        "第二类错误虽然能通过 `JSON.parse`，但仍会显式提示结构不合法，不能假装当普通代码块处理。",
      ],
    },
    {
      id: "graph-node-detail-fields",
      title: "节点颜色与详情字段",
      description:
        "当你希望图谱不只是“连线关系”，还要体现重要程度和节点详情时，可以补 `color/edgeColor/tags/content/locked`。",
      code: `\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [
    {
      "id": "core",
      "type": "knowledgeNode",
      "position": {
        "x": 120,
        "y": 120
      },
      "data": {
        "label": "核心概念",
        "content": "<p>先掌握定义，再整理例题。</p>",
        "tags": [
          "重点",
          "必背"
        ],
        "createdAt": 1775174400000,
        "updatedAt": 1775174400000,
        "color": "purple",
        "edgeColor": "p0",
        "locked": true
      }
    }
  ],
  "edges": []
}
\`\`\``,
      notes: [
        "`data.color` 控制节点配色，`data.edgeColor` 控制节点出边颜色与重要程度说明。",
        "`data.content` 会显示在节点详情面板里，适合放简短的 HTML 说明。",
        "`locked` 会显示锁定标记，帮助你区分核心节点和可随时调整的草稿节点。",
      ],
    },
    {
      id: "graph-node-time-fields",
      title: "节点时间字段",
      description:
        "如果你想追踪节点是什么时候创建、最近一次是什么时候更新，可以补时间戳字段。",
      code: `\`\`\`graph
{
  "meta": {
    "schemaVersion": "1.0.0",
    "profileId": "knowledge.v1"
  },
  "nodes": [
    {
      "id": "history",
      "type": "knowledgeNode",
      "position": {
        "x": 120,
        "y": 120
      },
      "data": {
        "label": "版本演进",
        "content": "",
        "tags": [],
        "createdAt": 1712188800000,
        "updatedAt": 1712275200000
      }
    }
  ],
  "edges": []
}
\`\`\``,
      notes: [
        "`createdAt` 和 `updatedAt` 使用毫秒时间戳，而不是日期字符串。",
        "它们会显示在节点详情面板的时间区块，适合辅助追踪知识点或项目节点的演进过程。",
      ],
    },
  ],
};
