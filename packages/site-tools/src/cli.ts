import fs from "node:fs";
import path from "node:path";
import { assertNoteCategoryReferences, parseSiteConfig } from "@jas/content-core";
import { editorStateDirectory, withWorkspaceLock, workspaceFile, writeVersioned } from "./files";
import { loadWorkspace, readSite, SITE_FILE } from "./workspace";
import { importImage, importPhoto, savePhotos, recoverMediaCleanup } from "./media";
import { finalizeExport, prepareExport } from "./export";
import { migrateWorkspace } from "./migrate";
import { inspectPublication, publicationState, publishWorkspace } from "./publish";

export const TOOL_PROTOCOL = 2;
const output = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");

async function main() {
  if (Number(process.versions.node.split(".")[0]) < 20) throw new Error("站点工具需要 Node 20 或更新版本。");
  const command = process.argv[2];
  const root = fs.realpathSync(process.cwd());
  if (command === "prepare") { prepareExport(root); return; }
  if (command === "finalize") { finalizeExport(root); return; }
  if (command === "version") { output({ protocol: TOOL_PROTOCOL, version: JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version }); return; }
  const raw = process.stdin.isTTY ? "" : fs.readFileSync(0, "utf8");
  const input: Record<string, unknown> = raw.trim() ? JSON.parse(raw) : {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("命令输入必须为对象。");
  if (input.stateDirectory === undefined) input.stateDirectory = editorStateDirectory();
  const text = (key: string): string => { const value = input[key]; if (typeof value !== "string" || !value.trim()) throw new Error(`缺少 ${key}。`); return value; };
  let result: unknown;
  switch (command) {
    case "load_workspace": {
      if (fs.existsSync(workspaceFile(root, ".run/media-deletions.json", true))) await withWorkspaceLock(root, () => recoverMediaCleanup(root));
      result = loadWorkspace(root); break;
    }
    case "save_site": result = await withWorkspaceLock(root, () => {
      const site = parseSiteConfig(input.site);
      const workspace = loadWorkspace(root);
      const pages = new Set(workspace.pages.map((item) => item.slug));
      for (const item of site.navigation) if (item.target.startsWith("page:") && !pages.has(item.target.slice(5))) throw new Error("导航引用了不存在的独立页面。");
      assertNoteCategoryReferences(site.noteCategories, workspace.notes);
      return writeVersioned(workspaceFile(root, SITE_FILE), site, text("expectedVersion"));
    }); break;
    case "save_photos": result = await savePhotos(root, input.photos, text("expectedVersion")); break;
    case "import_image": result = await importImage(root, text("inputPath"), text("alt")); break;
    case "import_photo": {
      const strings: Record<string, string> = {};
      for (const key of ["alt", "id", "category", "takenAt", "location", "camera"]) if (input[key] !== undefined) { if (typeof input[key] !== "string") throw new Error(`${key} 必须为文本。`); strings[key] = input[key] as string; }
      result = await importPhoto({ root, inputPath: text("inputPath"), title: text("title"), requestId: input.operationId === undefined ? undefined : text("operationId"), ...strings }); break;
    }
    case "inspect_publication": result = await inspectPublication(root); break;
    case "publication_state": result = publicationState(root, text("stateDirectory")); break;
    case "publish": {
      if (input.retryFailed !== undefined && typeof input.retryFailed !== "boolean") throw new Error("重试选项无效。");
      result = await publishWorkspace(root, text("stateDirectory"), (state) => output({ type: "progress", state }), { retryFailed: input.retryFailed === true }); break;
    }
    case "migrate": result = await migrateWorkspace(root, text("backupDirectory"), input.site === undefined ? undefined : parseSiteConfig(input.site), { editorStateDirectory: text("stateDirectory") }); break;
    case "check_document_delete": {
      const relative = text("relative"); workspaceFile(root, relative);
      if (/^content\/pages\/[^/]+\.md$/i.test(relative)) {
        const slug = path.basename(relative).replace(/\.md$/i, "");
        if (readSite(root).navigation.some((item) => item.target === `page:${slug}`)) throw new Error("请先移除这个页面的导航项，再删除页面。");
      }
      result = null; break;
    }
    default: throw new Error(`不支持的站点命令：${command}`);
  }
  output({ type: "result", protocol: TOOL_PROTOCOL, data: result });
}
main().catch((error: unknown) => { output({ type: "error", message: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
