import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { parseSiteConfig, CONTENT_DIRS, parsePhotos, type SiteConfig } from "@jas/content-core";
import { atomicWrite, markdownFiles, withWorkspaceLock, workspaceFile } from "./files";
import { SITE_FILE, PHOTO_FILE } from "./workspace";

export async function migrateWorkspace(root: string, backupDirectory: string, site: SiteConfig): Promise<string[]> {
  const config = parseSiteConfig(site);
  return withWorkspaceLock(root, () => {
    fs.mkdirSync(backupDirectory, { recursive: true });
    const changed: string[] = [];
    const save = (relative: string, next: string) => {
      const destination = workspaceFile(root, relative, true);
      if (fs.existsSync(destination) && fs.readFileSync(destination, "utf8") === next) return;
      const backup = path.join(backupDirectory, relative);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (fs.existsSync(destination) && !fs.existsSync(backup)) fs.copyFileSync(destination, backup, fs.constants.COPYFILE_EXCL);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      atomicWrite(destination, next);
      changed.push(relative);
      atomicWrite(path.join(backupDirectory, "migration.json"), JSON.stringify({ root: fs.realpathSync(root), changed }, null, 2) + "\n");
    };
    for (const directory of Object.values(CONTENT_DIRS)) for (const relative of markdownFiles(root, `content/${directory}`, directory === "diary")) {
      const raw = fs.readFileSync(workspaceFile(root, relative), "utf8");
      const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
      const content = raw.slice(bom.length);
      const newline = raw.includes("\r\n") ? "\r\n" : "\n";
      const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
      if (!match) { save(relative, `${bom}---${newline}publication: published${newline}---${newline}${content}`); continue; }
      const document = parseDocument(match[2]);
      if (document.errors.length) throw new Error(`${relative}：${document.errors[0].message}`);
      if (document.has("publication")) continue;
      document.set("publication", "published");
      save(relative, bom + match[1] + document.toString({ lineWidth: 0 }).trimEnd().replace(/\r?\n/g, newline) + match[3] + match[4]);
    }
    const photoPath = workspaceFile(root, PHOTO_FILE, true);
    const old: Array<Record<string, unknown>> = fs.existsSync(photoPath) ? JSON.parse(fs.readFileSync(photoPath, "utf8")) : [];
    save(PHOTO_FILE, JSON.stringify(parsePhotos(old.map((photo) => ({ ...photo, publication: photo.publication ?? "published" }))), null, 2) + "\n");
    if (!fs.existsSync(workspaceFile(root, SITE_FILE, true))) save(SITE_FILE, JSON.stringify(config, null, 2) + "\n");
    return changed;
  });
}
