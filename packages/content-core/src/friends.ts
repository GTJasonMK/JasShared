import { imageSource } from "./publication";
import { readPublishedAt } from "./publication-time";
import type { Friend } from "./types";

export function parseFriends(value: unknown): Friend[] {
  if (!Array.isArray(value)) throw new Error("友链必须为数组。");
  const ids = new Set<string>();
  return value.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("友链条目必须为对象。");
    const row = input as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["id", "name", "url", "description", "avatar", "order", "publication", "publishedAt"].includes(key))) throw new Error("友链条目含未支持字段。");
    const text = (key: string, required = true) => { const value = row[key]; if (typeof value !== "string" || (required && !value.trim())) throw new Error(`友链${key}必须填写。`); return value.trim(); };
    const id = text("id");
    if (ids.has(id)) throw new Error(`友链标识重复：${id}`); ids.add(id);
    const url = text("url");
    if (!/^https?:\/\/[^\s]+$/i.test(url)) throw new Error(`友链地址无效：${url}`);
    const publication = row.publication === "draft" || row.publication === "published" ? row.publication : undefined;
    if (!publication) throw new Error("友链必须明确填写 publication。");
    if (!Number.isSafeInteger(row.order)) throw new Error("友链顺序必须为整数。");
    const avatar = row.avatar === undefined ? undefined : imageSource(row.avatar);
    const publishedAt = row.publishedAt === undefined ? undefined : readPublishedAt(row.publishedAt);
    return { id, name: text("name"), url, description: text("description", false), ...(avatar ? { avatar } : {}), order: row.order as number, publication, ...(publishedAt ? { publishedAt } : {}) };
  });
}

export function visibleFriends(friends: readonly Friend[]): Friend[] { return friends.filter((friend) => friend.publication === "published").sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)); }
