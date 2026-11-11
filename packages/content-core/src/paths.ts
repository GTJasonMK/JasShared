export function normalizeSlashes(filePath: string): string { return filePath.replace(/\\/g, "/"); }
export function pathIdentity(filePath: string): string {
  const normalized = normalizeSlashes(filePath);
  return /^(?:[a-z]:\/|\/\/)/i.test(normalized) ? normalized.toLowerCase() : normalized;
}
export function isSamePath(a: string, b: string): boolean { return pathIdentity(a) === pathIdentity(b); }

export function renameSiblingPath(oldPath: string, newBaseName: string, ext: string): string {
  const name = newBaseName.trim();
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) throw new Error("请输入完整的文件名，不能包含目录或 .、.. 段。");
  const separator = oldPath.includes("\\") ? "\\" : "/";
  const index = oldPath.lastIndexOf(separator);
  const parent = index < 0 ? "" : oldPath.slice(0, index + 1);
  const extension = ext.startsWith(".") ? ext : `.${ext}`;
  return parent + (name.toLowerCase().endsWith(extension.toLowerCase()) ? name : name + extension);
}
