import { parseSiteConfig, type SiteConfig } from "./site";

/** 历史结构只在显式迁移中处理。 */
export function migrateSiteConfig(value: unknown, options: { draft?: boolean } = {}): SiteConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return parseSiteConfig(value, options);
  const row = value as Record<string, unknown>;
  const next = { ...row };
  if (row.sections && typeof row.sections === "object" && !Array.isArray(row.sections) && !("timeline" in row.sections)) {
    next.sections = { ...row.sections, timeline: { title: "发布时间线", description: "", enabled: true } };
  }
  const home = row.home;
  if (!home || typeof home !== "object" || Array.isArray(home) || "motto" in home) return parseSiteConfig(next, options);
  const previous = home as Record<string, unknown>;
  const fields = ["heading", "accent", "description", "notesDescription", "projectsDescription"];
  if (Object.keys(previous).some((key) => !fields.includes(key)) || fields.some((key) => typeof previous[key] !== "string")) {
    throw new Error("旧首页配置格式无效，原始内容已保留。");
  }
  return parseSiteConfig({ ...next, home: { motto: `${previous.heading}${previous.accent}`, description: previous.description } }, options);
}
