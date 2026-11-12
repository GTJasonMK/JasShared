import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readSite, validateWorkspace } from "./workspace";
import { workspaceFile } from "./files";

export function prepareExport(root = process.cwd()): void {
  validateWorkspace(root);
  fs.rmSync(workspaceFile(root, "out", true), { recursive: true, force: true });
}

function files(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    if (item.isSymbolicLink()) throw new Error("静态产物不接受符号链接。");
    const file = path.join(directory, item.name);
    return item.isDirectory() ? files(file) : [file];
  });
}

export function finalizeExport(root = process.cwd()): void {
  const site = readSite(root);
  const out = workspaceFile(root, "out");
  for (const [id, section] of Object.entries(site.sections)) {
    if (section.enabled) continue;
    for (const suffix of ["", ".html", ".txt"]) fs.rmSync(path.join(out, id + suffix), { recursive: true, force: true });
  }
  const assets = new Set<string>();
  for (const file of files(out).filter((file) => file.endsWith(".html"))) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/\/(?:media|photography)\/[^\s"'<>\\,]+/g)) assets.add(decodeURIComponent(match[0]));
  }
  for (const directory of ["media", "photography"]) {
    for (const file of files(path.join(out, directory))) {
      const src = "/" + path.relative(out, file).split(path.sep).join("/");
      if (!assets.has(src)) fs.unlinkSync(file);
    }
  }
  const sourceSha = process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40,64}$/.test(sourceSha)) throw new Error("部署版本标记无效。");
  fs.writeFileSync(path.join(out, "deployment.json"), JSON.stringify({ sourceSha }) + "\n");
}
