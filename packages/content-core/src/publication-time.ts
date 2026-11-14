import { isCalendarDate, readFrontmatterString } from "./content-common";

export const PUBLICATION_TIME_ZONE = "Asia/Shanghai";
const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: PUBLICATION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export function readPublishedAt(value: unknown): string | undefined {
  const text = readFrontmatterString(value);
  if (text === undefined) return undefined;
  if (isCalendarDate(text)) return text;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match || !isCalendarDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 || Number(match[6] ?? 0) > 23 || Number(match[7] ?? 0) > 59 || !Number.isFinite(Date.parse(text))) throw new Error("发布时间须为有效日期或带时区的 ISO 时间。");
  return new Date(text).toISOString();
}

export function publicationParts(value?: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  if (!value.includes("T")) return { date: value, time: "" };
  const { year, month, day, hour, minute, second } = Object.fromEntries(formatter.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}:${second}` };
}

export function publicationDay(value: string): string {
  return publicationParts(value).date;
}

export function formatPublishedAt(value: string): string {
  const { date, time } = publicationParts(value);
  return time ? `${date} ${time.slice(0, 5)}` : date;
}
