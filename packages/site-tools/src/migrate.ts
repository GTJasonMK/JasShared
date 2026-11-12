import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { parseSiteConfig, CONTENT_DIRS, parsePhotos, type SiteConfig } from "@jas/content-core";
import { migrateSiteConfig } from "@jas/content-core/site-migration";
import { atomicWrite, fileVersion, markdownFiles, withWorkspaceLock, workspaceFile, writeVersioned } from "./files";
import { SITE_FILE, PHOTO_FILE } from "./workspace";

export async function migrateWorkspace(root: string, backupDirectory: string, site?: SiteConfig, options: { editorStateDirectory?: string } = {}): Promise<string[]> {
  return withWorkspaceLock(root, () => {
    fs.mkdirSync(backupDirectory, { recursive: true });
    const canonicalRoot = fs.realpathSync(root);
    const journalPath = path.join(backupDirectory, "migration.json");
    const journal = { root: canonicalRoot, changed: [] as string[] };
    if (fs.existsSync(journalPath)) {
      const previous: unknown = JSON.parse(fs.readFileSync(journalPath, "utf8"));
      if (!previous || typeof previous !== "object" || Array.isArray(previous) || !("root" in previous) || previous.root !== canonicalRoot || !("changed" in previous) || !Array.isArray(previous.changed) || previous.changed.some((item) => typeof item !== "string")) throw new Error("迁移备份不属于当前工作区或记录已损坏，已停止写入。");
      journal.changed = previous.changed;
    } else if (fs.readdirSync(backupDirectory).length) throw new Error("备份目录已有文件且缺少迁移记录，请使用空目录。");
    const sitePath = workspaceFile(root, SITE_FILE, true);
    const backupSite = path.join(backupDirectory, SITE_FILE);
    const previousVersion = fs.existsSync(backupSite) ? fileVersion(backupSite) : fs.existsSync(sitePath) ? fileVersion(sitePath) : undefined;
    const config = fs.existsSync(sitePath) ? migrateSiteConfig(JSON.parse(fs.readFileSync(sitePath, "utf8"))) : parseSiteConfig(site);
    const changed: string[] = [];
    const checkpoint = (relative: string) => {
      changed.push(relative);
      journal.changed = [...new Set([...journal.changed, relative])];
      atomicWrite(journalPath, JSON.stringify(journal, null, 2) + "\n");
    };
    atomicWrite(journalPath, JSON.stringify(journal, null, 2) + "\n");
    const save = (relative: string, next: string) => {
      const destination = workspaceFile(root, relative, true);
      if (fs.existsSync(destination) && fs.readFileSync(destination, "utf8") === next) return;
      const backup = path.join(backupDirectory, relative);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (fs.existsSync(destination) && !fs.existsSync(backup)) fs.copyFileSync(destination, backup, fs.constants.COPYFILE_EXCL);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      atomicWrite(destination, next);
      checkpoint(relative);
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
    save(SITE_FILE, JSON.stringify(config, null, 2) + "\n");
    if (options.editorStateDirectory) {
      const file = path.join(options.editorStateDirectory, "editor-drafts.json");
      if (fs.existsSync(file)) {
        const version = fileVersion(file);
        const records: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!records || typeof records !== "object" || Array.isArray(records)) throw new Error("编辑器恢复记录格式无效，原始文件已保留。");
        let updated = false;
        for (const [key, value] of Object.entries(records)) {
          if (key !== `site:${canonicalRoot}` && !key.startsWith(`site-backup:${canonicalRoot}:`)) continue;
          if (!value || typeof value !== "object" || Array.isArray(value) || !("site" in value)) throw new Error("站点恢复草稿格式无效，原始文件已保留。");
          const draft = value as Record<string, unknown>;
          const next: Record<string, unknown> = { ...draft, site: migrateSiteConfig(draft.site, { draft: true }) };
          if (key === `site:${canonicalRoot}` && draft.siteVersion === previousVersion) next.siteVersion = fileVersion(sitePath);
          if (JSON.stringify(next) === JSON.stringify(draft)) continue;
          Object.assign(records, { [key]: next });
          updated = true;
        }
        if (updated) {
          const backup = path.join(backupDirectory, "editor-drafts.json");
          if (!fs.existsSync(backup)) fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
          writeVersioned(file, records, version);
          checkpoint("editor-drafts.json");
        }
      }
    }
    return changed;
  });
}
