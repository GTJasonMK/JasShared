import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = process.argv.includes("--local");
const output = path.join(root, ".artifacts", local ? "local" : "release");
const names = ["graph-core", "content-core", "agent-core", "graph-ui", "content-ui", "site-tools"];
const releaseBase = "https://github.com/GTJasonMK/JasShared/releases/download";
await mkdir(output, { recursive: true });

for (const name of names) {
  const directory = path.join(root, "packages", name);
  const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    if (!dependency.startsWith("@jas/")) continue;
    const dependencyName = dependency.slice(5);
    const filename = `jas-${dependencyName}-${version}.tgz`;
    manifest.dependencies[dependency] = local ? `file:${path.join(output, filename)}` : `${releaseBase}/${dependencyName}-v${version}/${filename}`;
  }
  manifest.files = ["dist", "LICENSE"];
  const stage = path.join(output, `stage-${name}`);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  await cp(path.join(directory, "dist"), path.join(stage, "dist"), { recursive: true });
  await writeFile(path.join(stage, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  execFileSync("npm", ["pack", "--pack-destination", output, "--ignore-scripts"], { cwd: stage, stdio: "inherit" });
  await rm(stage, { recursive: true, force: true });
}
