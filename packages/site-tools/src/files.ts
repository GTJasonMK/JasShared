import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";

export function editorStateDirectory(): string {
  return path.join(process.platform === "win32" ? process.env.APPDATA ?? path.join(os.homedir(), "AppData/Roaming") : process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local/share"), "JasBlogEditor");
}

export function fileVersion(file: string): string { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

export function workspaceFile(root: string, relative: string, create = false): string {
  const canonicalRoot = fs.realpathSync(root);
  const destination = path.resolve(canonicalRoot, relative);
  if (!destination.startsWith(canonicalRoot + path.sep)) throw new Error("目标必须位于当前工作区内。");
  let current = canonicalRoot;
  for (const part of path.relative(canonicalRoot, destination).split(path.sep)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) { if (create) continue; throw new Error(`文件不存在：${relative}`); }
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`受管路径不接受符号链接：${relative}`);
  }
  return destination;
}

export function atomicWrite(file: string, bytes: string | Buffer): void {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temporary, "wx", fs.existsSync(file) ? fs.statSync(file).mode : 0o600);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, file);
    if (process.platform !== "win32") { const directory = fs.openSync(path.dirname(file), "r"); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); } }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

export function writeVersioned(file: string, value: unknown, expected: string): string {
  if (!expected || fileVersion(file) !== expected) throw new Error("磁盘内容已变化，请重新载入或另存草稿。");
  atomicWrite(file, JSON.stringify(value, null, 2) + "\n");
  return fileVersion(file);
}

export async function withWorkspaceLock<T>(root: string, operation: () => T | Promise<T>): Promise<T> {
  const directory = workspaceFile(root, ".run", true);
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, "site-tools.lock");
  const fd = acquireLock(lock);
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: Date.now() })); return await operation(); }
  finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

function ownerAlive(file: string): boolean {
  const owner: { pid?: number } = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Number.isSafeInteger(owner.pid) || !owner.pid || owner.pid <= 0) throw new Error("工作区锁记录无效，已停止写入。");
  try { process.kill(owner.pid, 0); return true; }
  catch (error) { const code = (error as NodeJS.ErrnoException).code; if (code === "ESRCH") return false; if (code === "EPERM") return true; throw error; }
}

function acquireLock(lock: string): number {
  const recovery = lock + ".recovery";
  try {
    const fd = fs.openSync(lock, "wx", 0o600);
    try { if (fs.existsSync(recovery) && !ownerAlive(recovery)) fs.unlinkSync(recovery); }
    catch (error) { fs.closeSync(fd); fs.unlinkSync(lock); throw error; }
    return fd;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const guard = fs.openSync(recovery, "wx", 0o600);
  try {
    fs.writeFileSync(guard, JSON.stringify({ pid: process.pid }));
    if (ownerAlive(lock)) throw Object.assign(new Error("工作区正被其他操作占用，请等待完成。"), { code: "EEXIST" });
    fs.unlinkSync(lock);
    return fs.openSync(lock, "wx", 0o600);
  } finally { fs.closeSync(guard); fs.unlinkSync(recovery); }
}

export function markdownFiles(root: string, relative: string, recursive = false): string[] {
  const directory = workspaceFile(root, relative, true);
  if (!fs.existsSync(directory)) return [];
  const result: string[] = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    if (item.isSymbolicLink()) throw new Error(`内容目录不接受符号链接：${item.name}`);
    const child = path.join(relative, item.name);
    if (item.isDirectory() && recursive) result.push(...markdownFiles(root, child, true));
    else if (item.isFile() && /\.md$/i.test(item.name)) result.push(child);
  }
  return result.sort();
}
