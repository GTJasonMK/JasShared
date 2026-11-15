import { parseNoteCategories, type NoteCategory } from "./note-categories";
import { JASBLOG_CONTENT_TYPES, type ContentCollection, type ContentRef, type JasBlogContentType } from "./types";

export const SECTION_IDS = ["home", "notes", "projects", "diary", "graphs", "roadmap", "photography", "timeline"] as const;
export type SectionId = typeof SECTION_IDS[number];
export const CONTENT_SECTIONS: Record<JasBlogContentType, SectionId | null> = { note: "notes", project: "projects", graph: "graphs", roadmap: "roadmap", diary: "diary", page: null };
export interface SiteSection { title: string; description: string; enabled: boolean; pageSize?: number; templateId?: string }
export type CollectionNavigationTarget = `collection:${string}`;
export type NavigationItem = { target: SectionId | `page:${string}` | CollectionNavigationTarget; label: string; visible: boolean };
export type ResolvedNavigationItem = Pick<NavigationItem, "target" | "label"> & { href: string };
export interface SiteConfig {
  name: string; description: string;
  home: { motto: string; description: string };
  footer: string; sections: Record<SectionId, SiteSection>; navigation: NavigationItem[]; collections?: ContentCollection[];
  noteCategories: NoteCategory[];
  background?: { desktop?: string; mobile?: string; alt: string };
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
  const row = object(value, "站点配置", ["name", "description", "home", "footer", "sections", "navigation", "comments", "noteCategories", "collections", "background"]);
  const home = object(row.home, "首页", ["motto", "description"]);
  const sections = object(row.sections, "栏目", SECTION_IDS);
  const parsedSections = Object.fromEntries(SECTION_IDS.map((id) => {
    const section = object(sections[id], id, ["title", "description", "enabled", "pageSize", "templateId"]);
    if (section.pageSize !== undefined && (!Number.isSafeInteger(section.pageSize) || (section.pageSize as number) < 1 || (section.pageSize as number) > 100)) throw new Error(`${id}.pageSize 必须是1到100之间的整数。`);
    if (section.templateId !== undefined) text(section.templateId, `${id}.templateId`);
    return [id, { title: text(section.title, `${id}.title`), description: text(section.description, `${id}.description`, true), enabled: boolean(section.enabled, `${id}.enabled`), ...(section.pageSize === undefined ? {} : { pageSize: section.pageSize as number }), ...(section.templateId === undefined ? {} : { templateId: section.templateId as string }) }];
  })) as Record<SectionId, SiteSection>;
  if (!parsedSections.home.enabled) throw new Error("首页必须保持公开。");
  if (!Array.isArray(row.navigation)) throw new Error("导航必须为数组。");
  const seen = new Set<string>();
  const navigation = row.navigation.map((input: unknown): NavigationItem => {
    const item = object(input, "导航项", ["target", "label", "visible"]);
    const target = text(item.target, "导航目标");
    if (!(SECTION_IDS as readonly string[]).includes(target) && !(target.startsWith("page:") && validPageSlug(target.slice(5))) && !(target.startsWith("collection:") && validPageSlug(target.slice(11)))) throw new Error(`导航目标无效：${target}`);
    if (seen.has(target)) throw new Error(`导航目标重复：${target}`);
    seen.add(target);
    return { target: target as NavigationItem["target"], label: text(item.label, "导航名称"), visible: boolean(item.visible, "导航显示") };
  });
  const collections = parseCollections(row.collections, options);
  const background = row.background === undefined ? undefined : parseBackground(row.background, options);
  const comments = object(row.comments, "评论", ["enabled", "repo", "repoId", "category", "categoryId"]);
  const enabled = boolean(comments.enabled, "评论开关");
  const parsedComments = { enabled, repo: text(comments.repo, "评论仓库", !enabled), repoId: text(comments.repoId, "评论仓库 ID", !enabled), category: text(comments.category, "评论分类", !enabled), categoryId: text(comments.categoryId, "评论分类 ID", !enabled) };
  if (!options.draft && enabled && !/^[\w.-]+\/[\w.-]+$/.test(parsedComments.repo)) throw new Error("评论仓库必须为 owner/repo。");
  const parsed: SiteConfig = { name: text(row.name, "站点名称"), description: text(row.description, "站点介绍"), footer: text(row.footer, "页脚"), home: { motto: text(home.motto, "首页格言"), description: text(home.description, "首页介绍", true) }, sections: parsedSections, navigation, ...(row.collections === undefined ? {} : { collections }), noteCategories: parseNoteCategories(row.noteCategories, options), comments: parsedComments };
  if (background) parsed.background = background;
  validateCollectionTargets(parsed);
  return parsed;
}

export function navigationHref(target: NavigationItem["target"]): string { return target.startsWith("page:") ? `/pages/${encodeURIComponent(target.slice(5))}` : target.startsWith("collection:") ? `/collections/${encodeURIComponent(target.slice(11))}` : target === "home" ? "/" : `/${target}`; }

export function visibleNavigation(site: SiteConfig, publishedPages: readonly string[]): ResolvedNavigationItem[] {
  const pages = new Set(publishedPages);
  const collections = new Set((site.collections ?? []).filter((collection) => collection.enabled).map((collection) => collection.id));
  return site.navigation.filter((item) => item.visible && (item.target.startsWith("page:") ? pages.has(item.target.slice(5)) : item.target.startsWith("collection:") ? collections.has(item.target.slice(11)) : site.sections[item.target as SectionId].enabled)).map((item) => ({ target: item.target, href: navigationHref(item.target), label: item.label }));
}

function parseBackground(value: unknown, options: { draft?: boolean }): SiteConfig["background"] {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : (() => { throw new Error("背景配置必须为对象。"); })();
  if (Object.keys(row).some((key) => !["desktop", "mobile", "alt"].includes(key))) throw new Error("背景配置含未支持字段。");
  const asset = (input: unknown, label: string) => { if (input === undefined) return undefined; if (typeof input !== "string" || !/^\/(?:media|photography|backgrounds)\/[\p{L}\p{N}_.\/-]+$/u.test(input)) throw new Error(`${label}必须是本地素材地址。`); return input; };
  const alt = typeof row.alt === "string" ? row.alt.trim() : "";
  if (!options.draft && !alt) throw new Error("背景描述必须填写。");
  return { desktop: asset(row.desktop, "桌面背景"), mobile: asset(row.mobile, "移动背景"), alt };
}

function parseCollections(value: unknown, options: { draft?: boolean }): ContentCollection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("栏目集合必须为数组。");
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return value.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("栏目必须为对象。");
    const row = input as Record<string, unknown>;
    const keys = ["id", "slug", "title", "description", "enabled", "templateId", "pageSize", "rule", "manualItems"];
    if (Object.keys(row).some((key) => !keys.includes(key))) throw new Error("栏目含未支持字段。");
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!validPageSlug(id) || ids.has(id)) throw new Error(`栏目标识无效或重复：${id}`);
    if (!validPageSlug(slug) || slugs.has(slug)) throw new Error(`栏目地址无效或重复：${slug}`);
    ids.add(id); slugs.add(slug);
    const text = (key: string, empty = false) => { const value = row[key]; if (typeof value !== "string" || (!options.draft && !empty && !value.trim())) throw new Error(`栏目${key}必须填写。`); return value.trim(); };
    if (typeof row.enabled !== "boolean" || typeof row.templateId !== "string" || !row.templateId.trim()) throw new Error(`栏目${id}的状态或模板无效。`);
    if (!Number.isSafeInteger(row.pageSize) || (row.pageSize as number) < 1 || (row.pageSize as number) > 100) throw new Error(`栏目${id}的分页大小无效。`);
    const manualItems = Array.isArray(row.manualItems) ? row.manualItems.map((item) => parseCollectionItem(item, id)) : (() => { throw new Error(`栏目${id}的手动条目无效。`); })();
    const rule = row.rule === undefined ? undefined : parseCollectionRule(row.rule, id);
    return { id, slug, title: text("title"), description: text("description", true), enabled: row.enabled, templateId: row.templateId.trim(), pageSize: row.pageSize as number, ...(rule ? { rule } : {}), manualItems };
  });
}

function parseCollectionItem(value: unknown, collection: string): { ref: ContentRef; pinned: boolean; order: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`栏目${collection}包含无效条目。`);
  const row = value as Record<string, unknown>; const ref = row.ref;
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) throw new Error(`栏目${collection}的引用无效。`);
  const refRow = ref as Record<string, unknown>;
  if (typeof refRow.type !== "string" || !(JASBLOG_CONTENT_TYPES as readonly string[]).includes(refRow.type) || typeof refRow.slug !== "string" || !validPageSlug(refRow.slug)) throw new Error(`栏目${collection}的引用无效。`);
  if (typeof row.pinned !== "boolean" || !Number.isSafeInteger(row.order)) throw new Error(`栏目${collection}的条目顺序无效。`);
  return { ref: { type: refRow.type as ContentRef["type"], slug: refRow.slug }, pinned: row.pinned, order: row.order as number };
}

function parseCollectionRule(value: unknown, collection: string): NonNullable<ContentCollection["rule"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`栏目${collection}的规则无效。`);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["contentTypes", "categories", "tags", "tagMode", "includeDescendants"].includes(key))) throw new Error(`栏目${collection}的规则含未支持字段。`);
  for (const key of ["contentTypes", "categories", "tags"] as const) if (row[key] !== undefined && (!Array.isArray(row[key]) || (row[key] as unknown[]).some((item) => typeof item !== "string" || (key === "contentTypes" && !(JASBLOG_CONTENT_TYPES as readonly string[]).includes(item as string))))) throw new Error(`栏目${collection}的${key}无效。`);
  if (row.tagMode !== undefined && row.tagMode !== "any" && row.tagMode !== "all") throw new Error(`栏目${collection}的标签匹配模式无效。`);
  if (row.includeDescendants !== undefined && typeof row.includeDescendants !== "boolean") throw new Error(`栏目${collection}的分类范围无效。`);
  return { ...(row.contentTypes ? { contentTypes: row.contentTypes as JasBlogContentType[] } : {}), ...(row.categories ? { categories: row.categories as string[] } : {}), ...(row.tags ? { tags: row.tags as string[] } : {}), ...(row.tagMode ? { tagMode: row.tagMode as "any" | "all" } : {}), ...(row.includeDescendants === undefined ? {} : { includeDescendants: row.includeDescendants as boolean }) };
}

function validateCollectionTargets(site: SiteConfig): void {
  const ids = new Set((site.collections ?? []).map((collection) => collection.id));
  for (const item of site.navigation) if (item.target.startsWith("collection:") && !ids.has(item.target.slice(11))) throw new Error(`导航引用了不存在的栏目：${item.target.slice(11)}`);
}
