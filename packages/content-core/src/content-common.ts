export function readFrontmatterString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("必须为字符串。");
  return value.trim() || undefined;
}

export function parseStringArray(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error("必须为非空字符串组成的数组。");
  return [...new Set(value.map((item: string) => item.trim()))];
}

export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function readContentDate(value: unknown): string | undefined {
  const date = readFrontmatterString(value);
  if (date !== undefined && !isCalendarDate(date)) throw new Error("必须为有效的 YYYY-MM-DD 日期。");
  return date;
}
