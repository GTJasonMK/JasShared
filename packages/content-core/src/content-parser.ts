import { parse as parseYAML } from "yaml";
import { parseStringArray, readContentDate, readFrontmatterString } from "./content-common";
import { normalizeDiaryTime } from "./diary-contract";
import { normalizeRoadmapStatus } from "./roadmap-status";
import { parseDisplay, readPublication } from "./publication";
import { readNoteCategoryId } from "./note-categories";
import { readPublishedAt } from "./publication-time";
import type { ContentMetadata, ContentType, LineEnding, TechStackItem } from "./types";

export { parseRoadmapItemsFromContent } from "./roadmap-content";

export interface ParsedContentDocument {
  metadata: ContentMetadata;
  issues: string[];
  frontmatterRaw: Record<string, unknown>;
  frontmatterBlock: string | null;
  content: string;
  hasFrontmatter: boolean;
  hasBom: boolean;
  lineEnding: LineEnding;
}

export function parseMarkdownContent(raw: string, type: ContentType): ParsedContentDocument {
  const hasBom = raw.startsWith("\uFEFF");
  const text = hasBom ? raw.slice(1) : raw;
  const lineEnding: LineEnding = text.includes("\r\n") ? "crlf" : "lf";
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  const base = { content: (match ? match[4] : text).replace(/\r\n/g, "\n"), frontmatterBlock: match ? match[1] + match[2] + match[3] : null, hasFrontmatter: !!match, hasBom, lineEnding };
  if (!match) return { ...base, ...normalizeContentMetadata(type === "doc" ? {} : { publication: "draft" }, type), frontmatterRaw: {} };
  let fields: Record<string, unknown>;
  try {
    const parsed: unknown = parseYAML(match[2]);
    if (parsed !== undefined && parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) throw new Error("frontmatter 必须为字段对象。");
    fields = (parsed ?? {}) as Record<string, unknown>;
  } catch (error) {
    return { ...base, metadata: normalizeContentMetadata(type === "doc" ? {} : { publication: "draft" }, type).metadata, issues: [`${type} frontmatter YAML 解析失败：${errorMessage(error)}`], frontmatterRaw: {} };
  }
  return { ...base, ...normalizeContentMetadata(fields, type), frontmatterRaw: fields };
}

export function normalizeContentMetadata(fields: Record<string, unknown>, type: ContentType): { metadata: ContentMetadata; issues: string[] } {
  const issues: string[] = [];
  const field = <T,>(key: string, parse: (value: unknown) => T, empty: T): T => {
    try { return parse(fields[key]); }
    catch (error) { issues.push(`${type}.${key}：${errorMessage(error)}`); return empty; }
  };
  const text = (key: string) => field(key, readFrontmatterString, undefined);
  const date = field("date", readContentDate, undefined);
  let metadata: ContentMetadata;
  switch (type) {
    case "note": metadata = { title: text("title") ?? "", date: date ?? "", excerpt: text("excerpt") ?? "", tags: field("tags", parseStringArray, []), category: field("category", readNoteCategoryId, undefined) }; break;
    case "diary": metadata = {
      title: text("title") ?? "", date: date ?? "", time: field("time", normalizeDiaryTime, ""), excerpt: text("excerpt") ?? "", tags: field("tags", parseStringArray, []),
      mood: text("mood"), weather: text("weather"), location: text("location"), companions: field("companions", parseStringArray, []),
    }; break;
    case "project": metadata = { name: text("name") ?? "", description: text("description") ?? "", github: text("github") ?? "", demo: text("demo"), date, tags: field("tags", parseStringArray, []), techStack: field("techStack", normalizeTechStack, undefined) }; break;
    case "graph": metadata = { name: text("name") ?? "", description: text("description") ?? "", date }; break;
    case "roadmap": metadata = { title: text("title") ?? "", description: text("description") ?? "", date, status: field("status", normalizeRoadmapStatus, undefined) }; break;
    case "page": metadata = { title: text("title") ?? "", description: text("description") ?? "", date }; break;
    case "doc": metadata = { title: text("title") ?? "", date }; break;
  }
  const alias = type === "project" || type === "graph" ? "title" : type === "roadmap" ? "name" : null;
  if (alias && fields[alias] !== undefined) issues.push(`${type}.${alias} 已移除，请使用 ${alias === "title" ? "name" : "title"}。`);
  if (type !== "doc") {
    metadata.publication = field("publication", readPublication, undefined);
    metadata.publishedAt = field("publishedAt", readPublishedAt, undefined);
    if (type === "note" || type === "page") metadata.display = field("display", parseDisplay, undefined);
    else if (fields.display !== undefined) issues.push(`${type}.display 仅适用于笔记和独立页面。`);
  }
  return { metadata, issues };
}

export function normalizeTechStack(value: unknown): TechStackItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("techStack 必须为对象数组。");
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("techStack 每项必须为包含 name 的对象。");
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["name", "icon", "color"].includes(key))) throw new Error("techStack 包含未支持字段。");
    const name = readFrontmatterString(row.name);
    if (!name) throw new Error("techStack.name 不能为空。");
    return { name, ...(row.icon === undefined ? {} : { icon: readFrontmatterString(row.icon) }), ...(row.color === undefined ? {} : { color: readFrontmatterString(row.color) }) };
  });
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
