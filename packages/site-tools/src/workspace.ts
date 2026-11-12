import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIRS, parseMarkdownContent, parseSiteConfig, parsePhotos, readPublication, validPageSlug, type SiteConfig, type Photo, type JasBlogContentType } from "@jas/content-core";
import { fileVersion, markdownFiles, workspaceFile } from "./files";

export const SITE_FILE = "content/site.json";
export const PHOTO_FILE = "content/photography/photos.json";

export function readSite(root = process.cwd()): SiteConfig { return parseSiteConfig(JSON.parse(fs.readFileSync(workspaceFile(root, SITE_FILE), "utf8"))); }

export function readPhotos(root = process.cwd()): Photo[] {
  const photos = parsePhotos(JSON.parse(fs.readFileSync(workspaceFile(root, PHOTO_FILE), "utf8")));
  for (const photo of photos) for (const image of photo.images) {
    if (image.src.startsWith("/")) {
      const file = workspaceFile(root, `public${image.src}`);
      if (!fs.statSync(file).isFile()) throw new Error(`摄影图片不是普通文件：${image.src}`);
    }
  }
  return photos;
}

export function workspaceDocuments(root: string) {
  return (Object.entries(CONTENT_DIRS) as Array<[JasBlogContentType, string]>).flatMap(([type, directory]) => markdownFiles(root, `content/${directory}`, type === "diary").map((relative) => {
    const raw = fs.readFileSync(workspaceFile(root, relative), "utf8");
    const parsed = parseMarkdownContent(raw, type);
    return { relative, type, slug: path.basename(relative).replace(/\.md$/i, ""), raw, ...parsed };
  }));
}

export function loadWorkspace(root: string) {
  const site = readSite(root);
  const photos = readPhotos(root);
  const all = workspaceDocuments(root);
  const pages = all.filter((item) => item.type === "page").map((item) => ({ slug: item.slug, title: (item.metadata as { title: string }).title, publication: readPublication(item.frontmatterRaw.publication) }));
  const documents = Object.fromEntries(all.map((item) => [item.relative.replace(/\\/g, "/"), readPublication(item.frontmatterRaw.publication)]));
  const slugs = new Set(pages.map((item) => item.slug));
  for (const item of site.navigation) if (item.target.startsWith("page:") && !slugs.has(item.target.slice(5))) throw new Error(`导航引用了不存在的独立页面：${item.target.slice(5)}`);
  return { site, photos, pages, documents, siteVersion: fileVersion(workspaceFile(root, SITE_FILE)), photoVersion: fileVersion(workspaceFile(root, PHOTO_FILE)) };
}

export function validateWorkspace(root: string): void {
  const { site } = loadWorkspace(root);
  for (const document of workspaceDocuments(root)) {
    if (readPublication(document.frontmatterRaw.publication) === "draft") continue;
    if (document.type === "page" && !validPageSlug(document.slug)) throw new Error(`独立页面地址无效：${document.relative}`);
    if (document.type === "page" && !(document.metadata as { title: string }).title.trim()) throw new Error(`独立页面必须填写标题：${document.relative}`);
    if (document.issues.length) throw new Error(`${document.relative}：${document.issues.join("；")}`);
    readPublication(document.metadata.publication);
    const cover = document.metadata.display?.cover;
    if (cover?.src.startsWith("/")) workspaceFile(root, `public${cover.src}`);
  }
  parseSiteConfig(site);
}
