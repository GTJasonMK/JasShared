import { isCalendarDate, readContentDate } from "./content-common";

const DIARY_FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:-(\d{2})-(\d{2}))?(?:-(.+))?$/;

export const DIARY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DiaryNameInference {
  date: string;
  time: string;
  title: string;
}

export interface DiaryEntrySummaryLike {
  id: string;
  title: string;
  date: string;
  time: string;
  excerpt: string;
  tags: string[];
  mood?: string;
  weather?: string;
  location?: string;
}

export interface DiaryDaySummary {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  entryCount: number;
  mood?: string;
  weather?: string;
  location?: string;
}

function normalizeSlashes(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function titleFromSlug(value: string): string {
  return value.replace(/[-_]+/g, " ").trim();
}

export function inferDiaryFromFileName(fileNameNoExt: string): DiaryNameInference | null {
  const match = fileNameNoExt.match(DIARY_FILE_NAME_PATTERN);
  if (!match) return null;

  const [, date, hour, minute, titleSlug] = match;
  if (!isCalendarDate(date)) return null;
  return {
    date,
    time: normalizeDiaryTime(hour && minute ? `${hour}:${minute}` : ""),
    title: titleSlug ? titleFromSlug(titleSlug) : date,
  };
}

export function resolveDiaryDate(metaDate?: string, inferredDate?: string): string {
  return readContentDate(metaDate) ?? readContentDate(inferredDate) ?? "";
}

export function normalizeDiaryTime(value: unknown): string {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("time 必须为有效的 HH:MM 时间。");
  return value;
}

export function buildDiaryEntryId(filePath: string, diaryRootPath: string): string {
  const normalizedPath = normalizeSlashes(filePath);
  const normalizedRoot = normalizeSlashes(diaryRootPath).replace(/\/+$/, "");
  const prefix = normalizedRoot ? `${normalizedRoot}/` : "";

  if (prefix && normalizedPath.startsWith(prefix)) {
    return normalizedPath.slice(prefix.length).replace(/\.md$/i, "");
  }
  return (normalizedPath.split("/").pop() || normalizedPath).replace(/\.md$/i, "");
}

export function sortDiaryEntriesByTimeAsc<T extends Pick<DiaryEntrySummaryLike, "id" | "time">>(a: T, b: T): number {
  if (a.time === b.time) return a.id.localeCompare(b.id);
  return a.time.localeCompare(b.time);
}

export function buildDiaryDaySummary<T extends DiaryEntrySummaryLike>(date: string, entries: readonly T[]): DiaryDaySummary {
  if (entries.length === 0) throw new Error("日记聚合需要至少一条记录。");
  const sortedEntries = [...entries].sort(sortDiaryEntriesByTimeAsc);
  const latestEntry = sortedEntries[sortedEntries.length - 1];
  const reverseEntries = [...sortedEntries].reverse();

  return {
    slug: date,
    title: sortedEntries.length === 1 ? sortedEntries[0].title : `${date} 考研日志`,
    date,
    excerpt: latestEntry.excerpt || sortedEntries.map((entry) => entry.excerpt).find(Boolean) || "",
    tags: Array.from(new Set(sortedEntries.flatMap((entry) => entry.tags))).sort(),
    entryCount: sortedEntries.length,
    mood: latestEntry.mood || reverseEntries.map((entry) => entry.mood).find(Boolean),
    weather: latestEntry.weather || reverseEntries.map((entry) => entry.weather).find(Boolean),
    location: latestEntry.location || reverseEntries.map((entry) => entry.location).find(Boolean),
  };
}

export function groupDiaryEntries<T extends DiaryEntrySummaryLike & { error?: string }>(entries: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = groups.get(entry.date);
    if (group) group.push(entry); else groups.set(entry.date, [entry]);
  }
  return [...groups.entries()].map(([date, records]) => {
    const sorted = [...records].sort(sortDiaryEntriesByTimeAsc);
    return { ...buildDiaryDaySummary(date, sorted), entries: sorted, error: [...new Set(sorted.map((entry) => entry.error).filter(Boolean))].join("\n") || undefined };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
