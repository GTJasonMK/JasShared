import type { NoteMetadata, ProjectMetadata, GraphMetadata, RoadmapMetadata } from "./types";
import type { DiaryDaySummary } from "./diary-contract";
import type { RoadmapProgress } from "./roadmap-content";

export type NoteListEntry = NoteMetadata & { slug: string; tags: string[]; error?: string };
export type ProjectListEntry = Pick<ProjectMetadata, "name" | "description" | "date" | "tags" | "techStack"> & { slug: string; error?: string };
export type GraphListEntry = GraphMetadata & { slug: string; nodeCount: number; edgeCount: number; error?: string };
export type RoadmapListEntry = RoadmapMetadata & { slug: string; progress: RoadmapProgress; error?: string };
export type DiaryListEntry = DiaryDaySummary & { error?: string };

export function getTagOptions(items: ReadonlyArray<{ tags?: readonly string[] }>): string[] {
  return [...new Set(items.flatMap((item) => item.tags ?? []))].sort();
}

export function resolveDiaryFilter<T extends { date: string }>(days: readonly T[], year = "all", month = "all") {
  const years = [...new Set(days.map((day) => day.date.slice(0, 4)).filter(Boolean))].sort().reverse();
  const selectedYear = years.includes(year) ? year : "all";
  const months = [...new Set(days.filter((day) => selectedYear === "all" || day.date.startsWith(selectedYear + "-")).map((day) => day.date.slice(5, 7)).filter(Boolean))].sort().reverse();
  const selectedMonth = months.includes(month) ? month : "all";
  const filtered = days.filter((day) => (selectedYear === "all" || day.date.startsWith(selectedYear + "-")) && (selectedMonth === "all" || day.date.slice(5, 7) === selectedMonth));
  return { years, months, year: selectedYear, month: selectedMonth, days: filtered };
}
