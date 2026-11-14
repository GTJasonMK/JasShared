export type Publication = "draft" | "published";
export interface CoverImage { src: string; alt: string; width: number; height: number }
export interface DisplayOptions { cover?: CoverImage; toc?: boolean; comments?: boolean }
export interface PublicationMetadata { publication?: Publication; publishedAt?: string; display?: DisplayOptions }

export function readPublication(value: unknown): Publication {
  if (value !== "draft" && value !== "published") throw new Error("publication 必须明确填写 draft 或 published。");
  return value;
}

export function isLocalAsset(src: string): boolean {
  return /^\/(?:media|photography)\/[\p{L}\p{N}_.\/-]+$/u.test(src) && !src.split("/").some((part) => part === "." || part === "..");
}

export function imageSource(value: unknown): string {
  if (typeof value !== "string" || (!isLocalAsset(value) && !/^https:\/\/[^/@\s?#]+(?:\/[^\s\u0000-\u001f]*)?$/.test(value))) throw new Error("图片必须使用 /media/、/photography/ 本地地址或不含凭据的 HTTPS 地址。");
  return value;
}

export function parseCover(value: unknown): CoverImage {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("图片信息必须为对象。");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["src", "alt", "width", "height"].includes(key))) throw new Error("图片包含未支持字段。");
  if (typeof row.alt !== "string" || !row.alt.trim()) throw new Error("请填写图片描述。");
  if (!Number.isSafeInteger(row.width) || !Number.isSafeInteger(row.height) || (row.width as number) <= 0 || (row.height as number) <= 0) throw new Error("图片尺寸必须为正整数。");
  return { src: imageSource(row.src), alt: row.alt.trim(), width: row.width as number, height: row.height as number };
}

export function parseDisplay(value: unknown): DisplayOptions | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("display 必须为对象。");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !["cover", "toc", "comments"].includes(key))) throw new Error("display 包含未支持字段。");
  for (const key of ["toc", "comments"] as const) if (row[key] !== undefined && typeof row[key] !== "boolean") throw new Error(`${key} 必须为布尔值。`);
  return { ...(row.cover === undefined ? {} : { cover: parseCover(row.cover) }), ...(row.toc === undefined ? {} : { toc: row.toc as boolean }), ...(row.comments === undefined ? {} : { comments: row.comments as boolean }) };
}

export function contentDisplay(metadata: PublicationMetadata, type: string): { toc: boolean; comments: boolean } {
  return { toc: metadata.display?.toc ?? (type === "note" || type === "page"), comments: metadata.display?.comments ?? type === "note" };
}
