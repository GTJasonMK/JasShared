import fs from "node:fs";
import path from "node:path";
import { assertNoteCategoryReferences, CONTENT_DIRS, parseMarkdownContent, parseSiteConfig, parsePhotos, parseFriends, parseTemplateManifest, readPublication, validPageSlug, templateById, type SiteConfig, type Photo, type JasBlogContentType, type NoteMetadata, type SiteWorkspaceData, type Friend, type TemplateManifest, type ContentSummary } from "@jas/content-core";
import { fileVersion, markdownFiles, workspaceFile } from "./files";

export const SITE_FILE = "content/site.json";
export const PHOTO_FILE = "content/photography/photos.json";
export const FRIENDS_FILE = "content/friends.json";
export const TEMPLATE_MANIFEST_FILE = "content/template-manifest.json";

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

export function readFriends(root = process.cwd()): Friend[] { const file = workspaceFile(root, FRIENDS_FILE, true); return fs.existsSync(file) ? parseFriends(JSON.parse(fs.readFileSync(file, "utf8"))) : []; }
export function readTemplateManifest(root = process.cwd()): TemplateManifest { const file = workspaceFile(root, TEMPLATE_MANIFEST_FILE, true); return fs.existsSync(file) ? parseTemplateManifest(JSON.parse(fs.readFileSync(file, "utf8"))) : { version: 1, templates: [] }; }

export function workspaceDocuments(root: string) {
  return (Object.entries(CONTENT_DIRS) as Array<[JasBlogContentType, string]>).flatMap(([type, directory]) => markdownFiles(root, `content/${directory}`, type === "diary").map((relative) => {
    const raw = fs.readFileSync(workspaceFile(root, relative), "utf8");
    const parsed = parseMarkdownContent(raw, type);
    return { relative, type, slug: path.basename(relative).replace(/\.md$/i, ""), raw, ...parsed };
  }));
}

function readWorkspace(root: string) {
  const site = readSite(root);
  const photos = readPhotos(root);
  const friends = readFriends(root);
  const templateManifest = readTemplateManifest(root);
  const all = workspaceDocuments(root);
  const documents = Object.fromEntries(all.map((item) => [item.relative.replace(/\\/g, "/"), readPublication(item.metadata.publication)]));
  const content: ContentSummary[] = all.map((item) => {
    const metadata = item.metadata as { title?: string; name?: string; category?: string; tags?: string[]; date?: string; publishedAt?: string };
    return { ref: { type: item.type, slug: item.slug }, path: item.relative.replace(/\\/g, "/"), title: metadata.title ?? metadata.name ?? item.slug, ...(metadata.category ? { category: metadata.category } : {}), ...(metadata.tags ? { tags: metadata.tags } : {}), publication: documents[item.relative.replace(/\\/g, "/")], ...(metadata.date ? { date: metadata.date } : {}), ...(metadata.publishedAt ? { publishedAt: metadata.publishedAt } : {}) };
  });
  const pages = all.filter((item) => item.type === "page").map((item) => ({ slug: item.slug, title: (item.metadata as { title: string }).title, publication: documents[item.relative.replace(/\\/g, "/")] }));
  const notes = all.filter((item) => item.type === "note").map((item) => ({ path: item.relative.replace(/\\/g, "/"), title: (item.metadata as NoteMetadata).title, category: (item.metadata as NoteMetadata).category, publication: documents[item.relative.replace(/\\/g, "/")] }));
  const slugs = new Set(pages.map((item) => item.slug));
  for (const item of site.navigation) if (item.target.startsWith("page:") && !slugs.has(item.target.slice(5))) throw new Error(`导航引用了不存在的独立页面：${item.target.slice(5)}`);
  const friendsFile = workspaceFile(root, FRIENDS_FILE, true);
  return { data: { site, photos, friends, templateManifest, content, pages, notes, documents, siteVersion: fileVersion(workspaceFile(root, SITE_FILE)), photoVersion: fileVersion(workspaceFile(root, PHOTO_FILE)), friendsVersion: fs.existsSync(friendsFile) ? fileVersion(friendsFile) : "" }, all };
}

export function loadWorkspace(root: string): SiteWorkspaceData { return readWorkspace(root).data; }

export function validateWorkspace(root: string): void {
  const { data, all } = readWorkspace(root);
  assertNoteCategoryReferences(data.site.noteCategories, data.notes.filter((note) => note.publication === "published"));
  const refs = new Set(all.map((item) => `${item.type}:${item.slug}`));
  for (const document of all) {
    for (const related of document.metadata.related ?? []) if (!refs.has(`${related.type}:${related.slug}`)) throw new Error(`${document.relative}：related 引用了不存在的内容 ${related.type}:${related.slug}`);
  }
  for (const collection of data.site.collections ?? []) {
    const template = templateById(data.templateManifest ?? { version: 1, templates: [] }, collection.templateId);
    if (template.kind !== "collection") throw new Error(`栏目${collection.id}引用的模板不是栏目模板：${collection.templateId}`);
    for (const item of collection.manualItems) {
      if (!refs.has(`${item.ref.type}:${item.ref.slug}`)) throw new Error(`栏目${collection.id}引用了不存在的内容：${item.ref.type}:${item.ref.slug}`);
      if (!template.contentTypes.includes(item.ref.type)) throw new Error(`栏目${collection.id}的模板不支持内容类型：${item.ref.type}`);
    }
  }
  for (const document of all) {
    if (data.documents[document.relative.replace(/\\/g, "/")] === "draft") continue;
    if (document.type === "page" && !validPageSlug(document.slug)) throw new Error(`独立页面地址无效：${document.relative}`);
    if (document.type === "page" && !(document.metadata as { title: string }).title.trim()) throw new Error(`独立页面必须填写标题：${document.relative}`);
    if (document.issues.length) throw new Error(`${document.relative}：${document.issues.join("；")}`);
    const cover = document.metadata.display?.cover;
    if (cover?.src.startsWith("/")) workspaceFile(root, `public${cover.src}`);
  }
}
