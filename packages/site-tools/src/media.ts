import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { isLocalAsset, parsePhotos, type Photo, type PhotoImage, type CoverImage } from "@jas/content-core";
import { atomicWrite, fileVersion, withWorkspaceLock, workspaceFile, writeVersioned } from "./files";
import { PHOTO_FILE, readPhotos, workspaceDocuments } from "./workspace";

export interface ImportPhotoOptions { inputPath: string; title: string; alt?: string; id?: string; category?: string; takenAt?: string; location?: string; camera?: string; root?: string; requestId?: string }
interface ImportCheckpoint { signature: string; sourceHash: string; complete: boolean; images: Record<string, { hash: string; width: number; height: number }> }
const hashPattern = /^[a-f0-9]{64}$/;

function parseImportCheckpoint(value: unknown): ImportCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("图片导入恢复记录无效，已有成果已保留。");
  const row = value as Record<string, unknown>;
  if (typeof row.signature !== "string" || !hashPattern.test(row.signature) || typeof row.sourceHash !== "string" || !hashPattern.test(row.sourceHash) || typeof row.complete !== "boolean" || !row.images || typeof row.images !== "object" || Array.isArray(row.images)) throw new Error("图片导入恢复记录无效，已有成果已保留。");
  for (const [name, value] of Object.entries(row.images)) {
    const image = value as Record<string, unknown> | null;
    if (!["full.webp", "640.webp", "960.webp"].includes(name) || !image || typeof image.hash !== "string" || !hashPattern.test(image.hash) || !Number.isSafeInteger(image.width) || (image.width as number) <= 0 || !Number.isSafeInteger(image.height) || (image.height as number) <= 0) throw new Error("图片导入恢复记录包含无效尺寸或指纹，已有成果已保留。");
  }
  return row as unknown as ImportCheckpoint;
}

export async function importPhoto({ inputPath, title, alt, id, requestId, root = process.cwd(), ...details }: ImportPhotoOptions): Promise<Photo> {
  const photoId = id ?? path.parse(inputPath).name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  const [draft] = parsePhotos([{ id: photoId, title, alt: alt ?? title, ...details, publication: "draft", images: [{ src: `/photography/${photoId}/full.webp`, width: 1, height: 1 }] }]);
  return withWorkspaceLock(root, async () => {
    const photos = readPhotos(root);
    if (requestId && !/^[A-Za-z0-9_-]{1,80}$/.test(requestId)) throw new Error("导入请求 ID 无效。");
    const journal = requestId ? workspaceFile(root, `.run/import-${requestId}.json`, true) : null;
    const signature = createHash("sha256").update(JSON.stringify({ draft, inputPath: path.resolve(inputPath) })).digest("hex");
    let checkpoint = journal && fs.existsSync(journal) ? parseImportCheckpoint(JSON.parse(fs.readFileSync(journal, "utf8"))) : undefined;
    if (checkpoint && checkpoint.signature !== signature) throw new Error("导入请求已绑定其他输入，已有成果已保留。");
    if (checkpoint && fs.existsSync(inputPath) && checkpoint.sourceHash !== fileVersion(inputPath)) throw new Error("导入原片已变化，请创建新的导入请求。");
    const existing = photos.find((photo) => photo.id === photoId);
    if (existing) {
      if (!checkpoint) throw new Error(`作品 ${photoId} 已存在，请指定另一个 ID。`);
      checkpoint.complete = true; atomicWrite(journal!, JSON.stringify(checkpoint)); return existing;
    }
    if (checkpoint?.complete) throw new Error("该请求已经完成，作品后来被移除，请重新选择照片发起导入。");
    const destination = workspaceFile(root, `public/photography/${photoId}`, true);
    const metadata = await sharp(inputPath, { failOn: "warning" }).metadata();
    if (metadata.pages && metadata.pages > 1) throw new Error("摄影作品仅接受单张静态图片。");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (!checkpoint) {
      if (fs.existsSync(destination)) fs.mkdirSync(destination);
      if (journal) { checkpoint = { signature, sourceHash: fileVersion(inputPath), complete: false, images: {} }; atomicWrite(journal, JSON.stringify(checkpoint)); }
      fs.mkdirSync(destination);
    } else fs.mkdirSync(destination, { recursive: true });
    const saved = (name: string) => {
      const file = path.join(destination, name); const entry = checkpoint?.images[name];
      if (!fs.existsSync(file)) return null;
      if (!entry || entry.hash !== fileVersion(file)) throw new Error(`已有生成图片发生变化，已保留：${name}`);
      return entry;
    };
    const persistImage = async (name: string, pipeline: sharp.Sharp) => {
      const cached = saved(name); if (cached) return cached;
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      const entry = { hash: createHash("sha256").update(data).digest("hex"), width: info.width, height: info.height };
      if (checkpoint && journal) { checkpoint.images[name] = entry; atomicWrite(journal, JSON.stringify(checkpoint)); }
      atomicWrite(path.join(destination, name), data); return entry;
    };
    let committed = false;
    try {
      const full = await persistImage("full.webp", sharp(inputPath, { failOn: "warning" }).autoOrient().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }));
      const images: PhotoImage[] = [];
      for (const size of [640, 960]) {
        if (Math.max(full.width, full.height) <= size) continue;
        const width = Math.round(full.width * size / Math.max(full.width, full.height));
        if (width < 1 || width >= full.width || width <= (images[images.length - 1]?.width ?? 0)) continue;
        const image = await persistImage(`${size}.webp`, sharp(path.join(destination, "full.webp")).resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }));
        images.push({ src: `/photography/${photoId}/${size}.webp`, width: image.width, height: image.height });
      }
      images.push({ src: `/photography/${photoId}/full.webp`, width: full.width, height: full.height });
      const photo = { ...draft, images };
      atomicWrite(workspaceFile(root, PHOTO_FILE), JSON.stringify(parsePhotos([photo, ...photos]), null, 2) + "\n");
      committed = true;
      if (checkpoint && journal) { checkpoint.complete = true; atomicWrite(journal, JSON.stringify(checkpoint)); }
      return photo;
    } finally { if (!committed && !checkpoint) fs.rmSync(destination, { recursive: true }); }
  });
}

export async function importImage(root: string, inputPath: string, alt: string): Promise<CoverImage> {
  if (!alt.trim()) throw new Error("请填写图片描述。");
  const metadata = await sharp(inputPath, { failOn: "warning" }).metadata();
  if (metadata.pages && metadata.pages > 1) throw new Error("仅接受单张静态图片。");
  const { data, info } = await sharp(inputPath, { failOn: "warning" }).autoOrient().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  const id = createHash("sha256").update(data).digest("hex");
  return withWorkspaceLock(root, () => {
    const target = workspaceFile(root, `public/media/${id}.webp`, true);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) atomicWrite(target, data);
    return { src: `/media/${id}.webp`, alt: alt.trim(), width: info.width, height: info.height };
  });
}

export function assetReferences(root: string, sources: string[]): string[] {
  return workspaceDocuments(root).filter((document) => sources.some((src) => document.raw.includes(src) || document.raw.includes(encodeURI(src)) || document.metadata.display?.cover?.src === src)).map((document) => document.relative);
}

export async function savePhotos(root: string, input: unknown, expected: string): Promise<string> {
  const photos = parsePhotos(input);
  return withWorkspaceLock(root, () => {
    const previous = readPhotos(root);
    const retained = new Set(photos.flatMap((photo) => photo.images.map((image) => image.src)));
    const removed = previous.flatMap((photo) => photo.images.map((image) => image.src)).filter((src) => !retained.has(src));
    const references = assetReferences(root, removed);
    if (references.length) throw new Error(`图片仍被以下内容引用：${references.join("、")}`);
    for (const photo of photos) for (const image of photo.images) if (image.src.startsWith("/")) workspaceFile(root, `public${image.src}`);
    recoverMediaCleanup(root);
    if (fileVersion(workspaceFile(root, PHOTO_FILE)) !== expected) throw new Error("摄影清单已变化，请重新载入。");
    const journal = workspaceFile(root, ".run/media-deletions.json", true);
    const entries = removed.filter((src) => src.startsWith("/")).map((src) => ({ src, version: fileVersion(workspaceFile(root, `public${src}`)) }));
    atomicWrite(journal, JSON.stringify({ expected, entries }) + "\n");
    const version = writeVersioned(workspaceFile(root, PHOTO_FILE), photos, expected);
    try { recoverMediaCleanup(root); } catch (error) { throw new Error(`摄影清单已保存，图片清理未完成，请重新载入继续清理：${String(error)}`); }
    return version;
  });
}

export function recoverMediaCleanup(root: string): void {
  const journal = workspaceFile(root, ".run/media-deletions.json", true);
  if (!fs.existsSync(journal)) return;
  const record: unknown = JSON.parse(fs.readFileSync(journal, "utf8"));
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("素材清理记录无效，已保留所有文件。");
  const { expected, entries } = record as { expected: unknown; entries: unknown };
  if (typeof expected !== "string" || !hashPattern.test(expected) || !Array.isArray(entries) || entries.some((entry) => !entry || typeof entry !== "object" || typeof entry.src !== "string" || !entry.src.startsWith("/photography/") || !isLocalAsset(entry.src) || typeof entry.version !== "string" || !hashPattern.test(entry.version))) throw new Error("素材清理记录包含无效路径或指纹，已保留所有文件。");
  if (fileVersion(workspaceFile(root, PHOTO_FILE)) === expected) { fs.unlinkSync(journal); return; }
  const retained = new Set(readPhotos(root).flatMap((photo) => photo.images.map((image) => image.src)));
  const references = assetReferences(root, entries.filter((entry) => !retained.has(entry.src)).map((entry) => entry.src));
  if (references.length) throw new Error(`待清理图片已被引用：${references.join("、")}`);
  const removable: string[] = [];
  for (const { src, version } of entries) {
    if (retained.has(src)) continue;
    const file = workspaceFile(root, `public${src}`, true);
    if (!fs.existsSync(file)) continue;
    if (fileVersion(file) !== version) throw new Error(`待清理图片已被修改，已保留：${src}`);
    removable.push(file);
  }
  for (const file of removable) fs.unlinkSync(file);
  for (const directory of new Set(entries.map((entry) => path.dirname(workspaceFile(root, `public${entry.src}`, true))))) {
    if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  }
  fs.unlinkSync(journal);
}
