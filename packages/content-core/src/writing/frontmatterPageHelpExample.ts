import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

export const FRONTMATTER_PAGE_HELP_EXAMPLE: FrontmatterHelpExample = {
  id: "page-standard", navTitle: "独立页面", title: "关于这个站点", type: "page",
  description: "使用固定模板展示一篇独立正文，例如个人介绍或联系方式。",
  suitableFor: "不属于文章栏目的独立内容。",
  commonPatterns: ["填写页面标题和摘要。", "用 Markdown 编辑正文。", "在导航设置中引用这个页面。"],
  writingTips: ["标题与地址分别维护。", "公开前先检查正文和图片描述。"],
  raw: '---\ntitle: 关于这个站点\ndescription: 记录与分享的个人空间。\npublication: draft\ndisplay:\n  toc: true\n  comments: false\n---\n\n## 关于\n\n在这里介绍自己和这个站点。\n\n## 联系方式\n\n填写希望公开的联系信息。\n',
};
