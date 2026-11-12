import { readFrontmatterString } from "./content-common";

export interface NoteCategory { id: string; name: string; parentId?: string }
export interface NoteCategoryNode extends NoteCategory { depth: number }
export const UNCATEGORIZED_NOTES = "__uncategorized__";

export function readNoteCategoryId(value: unknown): string | undefined {
  const id = readFrontmatterString(value);
  if (id && !/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(id)) throw new Error("分类标识只能包含文字、数字、下划线和连字符，并以文字或数字开头。");
  return id;
}

export function parseNoteCategories(value: unknown, options: { draft?: boolean } = {}): NoteCategory[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("笔记分类必须为数组。");
  const categories = value.map((input: unknown): NoteCategory => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("笔记分类必须为对象。");
    const row = input as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["id", "name", "parentId"].includes(key))) throw new Error("笔记分类含未支持字段。");
    const id = readNoteCategoryId(row.id);
    if (!id) throw new Error("笔记分类缺少标识。");
    if (typeof row.name !== "string" || (!options.draft && !row.name.trim())) throw new Error("请填写分类名称。");
    const parentId = readNoteCategoryId(row.parentId);
    return { id, name: options.draft ? row.name : row.name.trim(), ...(parentId ? { parentId } : {}) };
  });
  const byId = new Map<string, NoteCategory>();
  for (const category of categories) {
    if (byId.has(category.id)) throw new Error(`分类标识重复：${category.id}`);
    byId.set(category.id, category);
  }
  const complete = new Set<string>();
  for (const category of categories) {
    const visiting = new Set<string>();
    let current: NoteCategory | undefined = category;
    while (current && !complete.has(current.id)) {
      if (visiting.has(current.id)) throw new Error(`分类不能循环嵌套：${category.name || category.id}`);
      visiting.add(current.id);
      if (current.parentId && !byId.has(current.parentId)) throw new Error(`上级分类不存在：${current.parentId}`);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    for (const id of visiting) complete.add(id);
  }
  return categories;
}

export function flattenNoteCategories(categories: readonly NoteCategory[]): NoteCategoryNode[] {
  const children = new Map<string | undefined, NoteCategory[]>();
  for (const category of categories) {
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category);
    children.set(category.parentId, siblings);
  }
  const stack = [...(children.get(undefined) ?? [])].reverse().map((category) => ({ ...category, depth: 0 }));
  const result: NoteCategoryNode[] = [];
  while (stack.length) {
    const category = stack.pop()!;
    result.push(category);
    const nested = children.get(category.id) ?? [];
    for (let index = nested.length - 1; index >= 0; index--) stack.push({ ...nested[index], depth: category.depth + 1 });
  }
  return result;
}

export function noteCategoryPath(categories: readonly NoteCategory[], id?: string): NoteCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: NoteCategory[] = [];
  let current = id ? byId.get(id) : undefined;
  while (current) { path.push(current); current = current.parentId ? byId.get(current.parentId) : undefined; }
  return path.reverse();
}

export function noteCategoryDescendants(categories: readonly NoteCategory[], id: string): Set<string> {
  const descendants = new Set<string>();
  const ordered = flattenNoteCategories(categories);
  let depth: number | undefined;
  for (const category of ordered) {
    if (category.id === id) depth = category.depth;
    else if (depth !== undefined && category.depth <= depth) break;
    if (depth !== undefined) descendants.add(category.id);
  }
  return descendants;
}

export function filterNotesByCategory<T extends { category?: string }>(items: readonly T[], categories: readonly NoteCategory[], selected: string): T[] {
  if (!selected) return [...items];
  if (selected === UNCATEGORIZED_NOTES) return items.filter((item) => !item.category);
  const descendants = noteCategoryDescendants(categories, selected);
  return items.filter((item) => !!item.category && descendants.has(item.category));
}

export function assertNoteCategoryReferences(categories: readonly NoteCategory[], notes: readonly { path: string; category?: string }[]): void {
  const ids = new Set(categories.map((category) => category.id));
  for (const note of notes) if (note.category && !ids.has(note.category)) throw new Error(`文档 ${note.path} 引用了不存在的分类：${note.category}。请先为文档重新选择分类。`);
}
