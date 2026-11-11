import { lstat, readFile, writeFile, copyFile, rename, unlink, mkdir, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { migrateGraphData } from "@jas/graph-core/migration";
import { findGraphCodeBlocks } from "@jas/content-core";

export async function migrateGraphFile(filename, { apply = false, timestamp = Date.now() } = {}) {
  const info = await lstat(filename);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("迁移目标必须为普通文件。");
  const original = await readFile(filename, "utf8");
  const lineEnding = original.includes("\r\n") ? "\r\n" : "\n";
  const changes = [];
  const migrate = (text) => {
    const migrated = migrateGraphData(JSON.parse(text.replace(/^\uFEFF/, "")), timestamp);
    changes.push(...migrated.changes);
    return migrated.changes.length ? JSON.stringify(migrated.graph, null, 2).replace(/\n/g, lineEnding) : text;
  };
  let output = original;
  if (/\.json$/i.test(filename)) {
    const bom = original.startsWith("\uFEFF") ? "\uFEFF" : "";
    const migrated = migrate(original);
    if (changes.length) output = bom + migrated + (original.endsWith("\n") ? lineEnding : "");
  } else if (/\.md$/i.test(filename)) {
    for (const block of findGraphCodeBlocks(original).reverse()) {
      const migrated = migrate(block.body);
      if (migrated !== block.body) output = output.slice(0, block.bodyStart) + migrated + lineEnding + output.slice(block.bodyEnd);
    }
  } else throw new Error("仅支持 .json 和 .md 图谱文件。");
  const report = { path: path.resolve(filename), changed: output !== original, changes, applied: false, backup: null };
  if (!apply || !report.changed) return report;
  if (await readFile(filename, "utf8") !== original) throw new Error("文件在分析期间发生变化，已停止迁移。");
  const backup = `${filename}.backup-${timestamp}`;
  const temporary = `${filename}.migration-${timestamp}.tmp`;
  await copyFile(filename, backup, constants.COPYFILE_EXCL);
  let created = false;
  try {
    await writeFile(temporary, output, { flag: "wx", mode: info.mode });
    created = true;
    if (await readFile(filename, "utf8") !== original) throw new Error("文件在备份后发生变化，已停止迁移。");
    await rename(temporary, filename);
    created = false;
  } finally { if (created) await unlink(temporary); }
  return { ...report, applied: true, backup: path.resolve(backup) };
}

async function filesAt(target) {
  const info = await lstat(target);
  if (info.isSymbolicLink()) throw new Error(`不迁移符号链接：${target}`);
  if (!info.isDirectory()) return [target];
  const entries = await readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || ["node_modules", "target", "dist", "out"].includes(entry.name)) continue;
    const filename = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...await filesAt(filename));
    else if (entry.isFile() && /\.(?:json|md)$/i.test(entry.name)) files.push(filename);
  }
  return files;
}
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const reportAt = args.indexOf("--report");
  const reportFile = reportAt < 0 ? undefined : args[reportAt + 1];
  if (args.some((arg) => arg.startsWith("--") && !["--apply", "--report"].includes(arg))) throw new Error("未知迁移参数。");
  const targets = args.filter((arg, index) => !arg.startsWith("--") && (reportAt < 0 || index !== reportAt + 1));
  if (!targets.length || (reportAt >= 0 && !reportFile)) throw new Error("用法：node scripts/migrate-graphs.mjs <file-or-content-dir> [--apply] [--report report.json]");
  const timestamp = Date.now();
  const results = [];
  for (const target of targets) for (const filename of await filesAt(target)) {
    try { results.push(await migrateGraphFile(filename, { apply, timestamp })); }
    catch (error) { results.push({ path: path.resolve(filename), error: String(error), applied: false }); process.exitCode = 1; }
  }
  const report = JSON.stringify({ timestamp, apply, results }, null, 2) + "\n";
  if (reportFile) { await mkdir(path.dirname(path.resolve(reportFile)), { recursive: true }); await writeFile(reportFile, report, { flag: "wx" }); }
  process.stdout.write(report);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
