import { JASBLOG_CONTENT_TYPES, type JasBlogContentType, type TemplateDescriptor, type TemplateManifest } from "./types";

export function parseTemplateManifest(value: unknown): TemplateManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("模板清单必须为对象。");
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || !Array.isArray(row.templates)) throw new Error("模板清单版本或模板列表无效。");
  const ids = new Set<string>();
  const templates = row.templates.map((input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("模板描述必须为对象。");
    const item = input as Record<string, unknown>;
    if (Object.keys(item).some((key) => !["id", "label", "kind", "contentTypes", "capabilities", "fields"].includes(key))) throw new Error("模板描述含未支持字段。");
    if (typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)) throw new Error(`模板标识无效或重复：${String(item.id)}`);
    if (typeof item.label !== "string" || !item.label.trim() || !["collection", "detail", "page"].includes(item.kind as string)) throw new Error(`模板${item.id}的基础信息无效。`);
    if (!Array.isArray(item.contentTypes) || item.contentTypes.some((type) => typeof type !== "string" || !(JASBLOG_CONTENT_TYPES as readonly string[]).includes(type as string))) throw new Error(`模板${item.id}的内容类型无效。`);
    const capabilities = item.capabilities;
    if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) throw new Error(`模板${item.id}的能力无效。`);
    for (const key of ["pagination", "categoryFilter", "tagFilter", "series", "related"]) if ((capabilities as Record<string, unknown>)[key] !== undefined && typeof (capabilities as Record<string, unknown>)[key] !== "boolean") throw new Error(`模板${item.id}的能力无效。`);
    if (!Array.isArray(item.fields) || item.fields.some((field) => typeof field !== "string")) throw new Error(`模板${item.id}的字段无效。`);
    ids.add(item.id);
    return { id: item.id, label: item.label.trim(), kind: item.kind as TemplateDescriptor["kind"], contentTypes: item.contentTypes as JasBlogContentType[], capabilities: capabilities as TemplateDescriptor["capabilities"], fields: item.fields as string[] };
  });
  return { version: 1, templates };
}

export function templateById(manifest: TemplateManifest, id: string): TemplateDescriptor {
  const template = manifest.templates.find((item) => item.id === id);
  if (!template) throw new Error(`未找到模板：${id}`);
  return template;
}
