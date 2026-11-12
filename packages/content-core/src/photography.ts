import { imageSource, readPublication, type Publication } from "./publication";
export interface PhotoImage { src: string; width: number; height: number }
export interface Photo { id: string; title: string; alt: string; publication: Publication; images: PhotoImage[]; category?: string; takenAt?: string; location?: string; camera?: string }

export function parsePhotos(value: unknown, options: { draft?: boolean } = {}): Photo[] {
  if (!Array.isArray(value)) throw new Error("摄影作品清单必须为数组。");
  const ids = new Set<string>();
  return value.map((entry: unknown, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`第 ${index + 1} 张作品信息无效。`);
    const row = entry as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["id", "title", "alt", "publication", "images", "category", "takenAt", "location", "camera"].includes(key))) throw new Error(`第 ${index + 1} 张作品含未支持字段。`);
    const text = (key: string, required = false): string | undefined => { const input = row[key]; if (!required && input === undefined) return undefined; if (typeof input !== "string" || (!options.draft && !input.trim())) throw new Error(`第 ${index + 1} 张作品的 ${key} 不能为空。`); return options.draft ? input : input.trim(); };
    const id = text("id", true)!;
    if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(id) || ids.has(id)) throw new Error(`作品 ID 无效或重复：${id}`);
    ids.add(id);
    if (!Array.isArray(row.images) || !row.images.length) throw new Error(`作品 ${id} 必须包含图片。`);
    let previousWidth = 0;
    const images = row.images.map((value: unknown): PhotoImage => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`作品 ${id} 的图片信息无效。`);
      const image = value as Record<string, unknown>;
      if (Object.keys(image).some((key) => !["src", "width", "height"].includes(key))) throw new Error(`作品 ${id} 的图片含未支持字段。`);
      for (const key of ["width", "height"] as const) if (!Number.isSafeInteger(image[key]) || (image[key] as number) <= 0) throw new Error(`作品 ${id} 的 ${key} 必须为正整数。`);
      if ((image.width as number) <= previousWidth) throw new Error(`作品 ${id} 的图片必须按宽度递增排列。`);
      previousWidth = image.width as number;
      const src = imageSource(image.src);
      if (src.startsWith("/") && !src.startsWith("/photography/")) throw new Error("摄影本地图片必须位于 /photography/ 下。");
      return { src, width: image.width as number, height: image.height as number };
    });
    const takenAt = text("takenAt");
    if (takenAt && (!/^\d{4}-\d{2}-\d{2}$/.test(takenAt) || !Number.isFinite(Date.parse(takenAt)) || new Date(takenAt).toISOString().slice(0, 10) !== takenAt)) throw new Error(`作品 ${id} 的拍摄日期无效。`);
    return { id, title: text("title", true)!, alt: text("alt", true)!, publication: readPublication(row.publication), images, category: text("category"), takenAt, location: text("location"), camera: text("camera") };
  });
}
