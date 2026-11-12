import { parseNoteCategories, type NoteCategory } from "./note-categories";

export const SECTION_IDS = ["home", "notes", "projects", "diary", "graphs", "roadmap", "photography"] as const;
export type SectionId = typeof SECTION_IDS[number];
export interface SiteSection { title: string; description: string; enabled: boolean }
export type NavigationItem = { target: SectionId | `page:${string}`; label: string; visible: boolean };
export type ResolvedNavigationItem = Pick<NavigationItem, "target" | "label"> & { href: string };
export interface SiteConfig {
  name: string; description: string;
  home: { motto: string; description: string };
  footer: string; sections: Record<SectionId, SiteSection>; navigation: NavigationItem[];
  noteCategories: NoteCategory[];
  comments: { enabled: boolean; repo: string; repoId: string; category: string; categoryId: string };
}

export function validPageSlug(value: string): boolean { return /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(value) && value !== "__empty_static_params__"; }

export function parseSiteConfig(value: unknown, options: { draft?: boolean } = {}): SiteConfig {
  const object = (input: unknown, label: string, keys: readonly string[]): Record<string, unknown> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} 必须为对象。`);
    const row = input as Record<string, unknown>;
    if (Object.keys(row).some((key) => !keys.includes(key))) throw new Error(`${label} 含未支持字段。`);
    return row;
  };
  const text = (input: unknown, label: string, empty = false): string => { if (typeof input !== "string" || (!options.draft && !empty && !input.trim())) throw new Error(`${label} 必须填写文本。`); return options.draft ? input : input.trim(); };
  const boolean = (input: unknown, label: string): boolean => { if (typeof input !== "boolean") throw new Error(`${label} 必须为布尔值。`); return input; };
  const row = object(value, "站点配置", ["name", "description", "home", "footer", "sections", "navigation", "comments", "noteCategories"]);
  const home = object(row.home, "首页", ["motto", "description"]);
  const sections = object(row.sections, "栏目", SECTION_IDS);
  const parsedSections = Object.fromEntries(SECTION_IDS.map((id) => {
    const section = object(sections[id], id, ["title", "description", "enabled"]);
    return [id, { title: text(section.title, `${id}.title`), description: text(section.description, `${id}.description`, true), enabled: boolean(section.enabled, `${id}.enabled`) }];
  })) as Record<SectionId, SiteSection>;
  if (!parsedSections.home.enabled) throw new Error("首页必须保持公开。");
  if (!Array.isArray(row.navigation)) throw new Error("导航必须为数组。");
  const seen = new Set<string>();
  const navigation = row.navigation.map((input: unknown): NavigationItem => {
    const item = object(input, "导航项", ["target", "label", "visible"]);
    const target = text(item.target, "导航目标");
    if (!(SECTION_IDS as readonly string[]).includes(target) && !(target.startsWith("page:") && validPageSlug(target.slice(5)))) throw new Error(`导航目标无效：${target}`);
    if (seen.has(target)) throw new Error(`导航目标重复：${target}`);
    seen.add(target);
    return { target: target as NavigationItem["target"], label: text(item.label, "导航名称"), visible: boolean(item.visible, "导航显示") };
  });
  const comments = object(row.comments, "评论", ["enabled", "repo", "repoId", "category", "categoryId"]);
  const enabled = boolean(comments.enabled, "评论开关");
  const parsedComments = { enabled, repo: text(comments.repo, "评论仓库", !enabled), repoId: text(comments.repoId, "评论仓库 ID", !enabled), category: text(comments.category, "评论分类", !enabled), categoryId: text(comments.categoryId, "评论分类 ID", !enabled) };
  if (!options.draft && enabled && !/^[\w.-]+\/[\w.-]+$/.test(parsedComments.repo)) throw new Error("评论仓库必须为 owner/repo。");
  return { name: text(row.name, "站点名称"), description: text(row.description, "站点介绍"), footer: text(row.footer, "页脚"), home: { motto: text(home.motto, "首页格言"), description: text(home.description, "首页介绍", true) }, sections: parsedSections, navigation, noteCategories: parseNoteCategories(row.noteCategories, options), comments: parsedComments };
}

export function navigationHref(target: NavigationItem["target"]): string { return target.startsWith("page:") ? `/pages/${encodeURIComponent(target.slice(5))}` : target === "home" ? "/" : `/${target}`; }

export function visibleNavigation(site: SiteConfig, publishedPages: readonly string[]): ResolvedNavigationItem[] {
  const pages = new Set(publishedPages);
  return site.navigation.filter((item) => item.visible && (item.target.startsWith("page:") ? pages.has(item.target.slice(5)) : site.sections[item.target as SectionId].enabled)).map((item) => ({ target: item.target, href: navigationHref(item.target), label: item.label }));
}
