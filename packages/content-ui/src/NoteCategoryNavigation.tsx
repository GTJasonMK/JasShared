"use client";

import { noteCategoryPath, UNCATEGORIZED_NOTES, type NoteCategory } from "@jas/content-core";
import { useEffect, useId, useState, type ReactNode } from "react";

export function NoteCategoryNavigation({ categories, selected, onChange }: { categories: readonly NoteCategory[]; selected: string; onChange: (id: string) => void }) {
  const id = useId();
  const [expanded, setExpanded] = useState(() => new Set(noteCategoryPath(categories, selected).map(({ id }) => id)));
  useEffect(() => {
    const path = noteCategoryPath(categories, selected).map(({ id }) => id);
    setExpanded((current) => path.every((id) => current.has(id)) ? current : new Set([...current, ...path]));
  }, [categories, selected]);
  if (!categories.length) return null;

  const children = new Map<string | undefined, NoteCategory[]>();
  for (const category of categories) {
    const siblings = children.get(category.parentId) ?? [];
    siblings.push(category);
    children.set(category.parentId, siblings);
  }
  const option = (id: string, name: string) => <button type="button" className="note-category-select" aria-pressed={selected === id} onClick={() => onChange(id)}>{name || "未命名分类"}</button>;
  const branches = (parentId?: string): ReactNode => (children.get(parentId) ?? []).map((category) => {
    const nested = children.has(category.id);
    const open = expanded.has(category.id);
    const name = category.name || "未命名分类";
    const listId = `${id}-${category.id}`;
    return <li key={category.id}>
      <div className="note-category-row">
        {option(category.id, name)}
        {nested && <button type="button" className="note-category-toggle" aria-label={`${open ? "收起" : "展开"}${name}`} aria-expanded={open} aria-controls={listId} onClick={() => setExpanded((current) => {
          const next = new Set(current);
          if (next.has(category.id)) next.delete(category.id); else next.add(category.id);
          return next;
        })}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>}
      </div>
      {nested && <ul id={listId} className="note-category-children" aria-label={`${name}的子分类`} hidden={!open}>{branches(category.id)}</ul>}
    </li>;
  });
  return <nav className="note-categories" aria-label="笔记分类"><ul className="note-category-tree">
    <li>{option("", "全部笔记")}</li>
    {branches()}
    <li>{option(UNCATEGORIZED_NOTES, "未分类")}</li>
  </ul></nav>;
}
