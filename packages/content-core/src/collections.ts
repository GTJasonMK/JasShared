import type { ContentCollection, ContentRef, JasBlogContentType } from "./types";

export interface CollectionDocument extends ContentRef {
  title: string;
  category?: string;
  tags?: string[];
  date?: string;
  publishedAt?: string;
}

export function resolveCollectionItems(collection: ContentCollection, documents: readonly CollectionDocument[]): CollectionDocument[] {
  const byRef = new Map(documents.map((document) => [`${document.type}:${document.slug}`, document]));
  const seen = new Set<string>();
  const manual = [...collection.manualItems].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order).flatMap((item) => {
    const key = refKey(item.ref); const document = byRef.get(key);
    if (!document || seen.has(key)) return [];
    seen.add(key); return [document];
  });
  const rule = documents.filter((document) => !seen.has(refKey(document)) && matchesRule(collection.rule, document));
  return [...manual, ...rule];
}

export function refKey(ref: ContentRef): string { return `${ref.type}:${ref.slug}`; }

function matchesRule(rule: ContentCollection["rule"], document: CollectionDocument): boolean {
  if (!rule) return false;
  if (rule.contentTypes?.length && !rule.contentTypes.includes(document.type as JasBlogContentType)) return false;
  if (rule.categories?.length && !rule.categories.includes(document.category ?? "")) return false;
  if (rule.tags?.length) {
    const tags = new Set(document.tags ?? []);
    const matches = rule.tags.map((tag) => tags.has(tag));
    if (rule.tagMode === "all" ? matches.some((matched) => !matched) : !matches.some(Boolean)) return false;
  }
  return Boolean(rule.contentTypes?.length || rule.categories?.length || rule.tags?.length);
}
