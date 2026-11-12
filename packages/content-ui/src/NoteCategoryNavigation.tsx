"use client";

import { noteCategoryPath, UNCATEGORIZED_NOTES, type NoteCategory } from "@jas/content-core";

export function NoteCategoryNavigation({ categories, selected, onChange }: { categories: readonly NoteCategory[]; selected: string; onChange: (id: string) => void }) {
  if (!categories.length) return null;
  const path = noteCategoryPath(categories, selected);
  const parents = [undefined, ...path] as const;
  return <nav className="note-categories" aria-label="笔记分类">{parents.map((parent, depth) => {
    const children = categories.filter((category) => category.parentId === parent?.id);
    if (!children.length) return null;
    const active = path[depth]?.id ?? (parent?.id ?? selected);
    const options = [{ id: parent?.id ?? "", name: "全部" }, ...children, ...(parent ? [] : [{ id: UNCATEGORIZED_NOTES, name: "未分类" }])];
    return <div key={parent?.id ?? "root"} className="note-category-row" data-nested={!!parent} role="group" aria-label={parent ? `${parent.name}的子分类` : "一级分类"}>
      {options.map(({ id, name }) => <button key={id} type="button" aria-pressed={active === id} onClick={() => onChange(id)}>{name || "未命名分类"}</button>)}
    </div>;
  })}</nav>;
}
