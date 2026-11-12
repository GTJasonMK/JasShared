export type { GraphData } from "@jas/graph-core";
export type { RoadmapStatus } from "./roadmap-status";
export type { RoadmapContentItem as RoadmapItem, RoadmapItemStatus, RoadmapPriority } from "./roadmap-content";
import type { RoadmapStatus } from "./roadmap-status";
import type { PublicationMetadata } from "./publication";

export type ContentType = "note" | "project" | "diary" | "roadmap" | "graph" | "page" | "doc";
export type JasBlogContentType = Exclude<ContentType, "doc">;
export type LineEnding = "lf" | "crlf";
export const JASBLOG_CONTENT_TYPES = ["project", "note", "diary", "graph", "roadmap", "page"] as const;
export const DIARY_DISPLAY_LABEL = "考研日志";
export const DIARY_TIMELINE_LABEL = `${DIARY_DISPLAY_LABEL}时间线`;
export const CONTENT_DIRS: Record<JasBlogContentType, string> = { note: "notes", project: "projects", diary: "diary", roadmap: "roadmaps", graph: "graphs", page: "pages" };
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = { note: "笔记", project: "项目", diary: DIARY_DISPLAY_LABEL, roadmap: "规划", graph: "图谱", page: "独立页面", doc: "文档" };
export const JASBLOG_SECTION_LABELS: Record<JasBlogContentType, string> = { project: "开源项目", note: "学习笔记", diary: DIARY_DISPLAY_LABEL, graph: "知识图谱", roadmap: "我的规划", page: "独立页面" };

export interface NoteMetadata extends PublicationMetadata { title: string; date: string; excerpt: string; tags?: string[] }
export interface DiaryMetadata extends NoteMetadata {
  time: string;
  mood?: string;
  weather?: string;
  location?: string;
  companions: string[];
}
export interface TechStackItem { name: string; icon?: string; color?: string }
export interface ProjectMetadata extends PublicationMetadata { name: string; description: string; github: string; demo?: string; date?: string; tags?: string[]; techStack?: TechStackItem[] }
export interface RoadmapMetadata extends PublicationMetadata { title: string; description: string; date?: string; status?: RoadmapStatus }
export interface GraphMetadata extends PublicationMetadata { name: string; description: string; date?: string }
export interface DocMetadata extends PublicationMetadata { title: string; date?: string }
export interface PageMetadata extends DocMetadata { description: string }
export type ContentMetadata = NoteMetadata | DiaryMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | PageMetadata | DocMetadata;

export interface DiaryEntry extends DiaryMetadata {
  id: string;
  tags: string[];
  content: string;
  error?: string;
}
export interface DiaryDay {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  entryCount: number;
  mood?: string;
  weather?: string;
  location?: string;
  entries: DiaryEntry[];
  error?: string;
}
