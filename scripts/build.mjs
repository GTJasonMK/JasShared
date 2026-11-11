import { readdir, readFile, writeFile, mkdir, cp, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = ["graph-core", "content-core", "agent-core", "graph-ui", "content-ui"];
const requested = process.argv.slice(2);
if (requested.some((name) => !names.includes(name))) throw new Error("未知的公共包。");
const selected = new Set(requested);
async function includeDependencies(name) {
  const manifest = JSON.parse(await readFile(path.join(root, "packages", name, "package.json"), "utf8"));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (!dependency.startsWith("@jas/") || selected.has(dependency.slice(5))) continue;
    selected.add(dependency.slice(5));
    await includeDependencies(dependency.slice(5));
  }
}
for (const name of requested) await includeDependencies(name);
const configDirectory = path.join(root, ".local", "build");
await mkdir(configDirectory, { recursive: true });

for (const name of names) {
  if (requested.length && !selected.has(name)) continue;
  const directory = path.join(root, "packages", name);
  const source = path.join(directory, "src");
  const dist = path.join(directory, "dist");
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  const files = (await readdir(source, { recursive: true }))
    .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts"));
  const config = {
    extends: "../../tsconfig.json",
    compilerOptions: { rootDir: `../../packages/${name}/src`, outDir: `../../packages/${name}/dist`, ...(name.endsWith("-core") ? { lib: ["ES2020"], types: [] } : {}) },
    include: [`../../packages/${name}/src`],
  };
  const configPath = path.join(configDirectory, `${name}.json`);
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
  execFileSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "-p", configPath], { stdio: "inherit" });
  await build({
    entryPoints: files.map((file) => path.join(source, file)),
    outdir: dist,
    outbase: source,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "neutral",
    target: "es2020",
    jsx: "automatic",
    packages: "external",
    loader: { ".css": "empty" },
    banner: name.endsWith("-ui") ? { js: '"use client";' } : undefined,
    logLevel: "warning",
  });
  if (name === "graph-core") {
    const { getGraphJsonSchema } = await import(new URL("../packages/graph-core/dist/index.js", import.meta.url));
    await writeFile(path.join(dist, "schema.json"), JSON.stringify(getGraphJsonSchema(), null, 2) + "\n");
  }
  if (name.endsWith("-ui")) {
    const cssPath = path.join(source, "styles.css");
    const result = await postcss([tailwind({ base: directory, optimize: true })]).process(await readFile(cssPath, "utf8"), { from: cssPath });
    const scope = name === "graph-ui" ? ".jas-graph" : ".jas-content";
    result.root.walkDecls("src", (declaration) => {
      declaration.value = declaration.value.replace(/url\(["']?[^)"']*\/fonts\/([^\)"']+)["']?\)/g, 'url("./fonts/$1")');
    });
    result.root.walkRules((rule) => {
      if (rule.parent.type === "rule" || /keyframes$/.test(rule.parent.name ?? "")) return;
      if (rule.selector.includes(scope)) return;
      rule.selector = /^:root(?:\s*,\s*:host)?$/.test(rule.selector) ? scope : `${scope}:is(${rule.selector}), ${scope} :is(${rule.selector})`;
    });
    // 预编译样式不再向宿主暴露 Tailwind 保留层，避免宿主把作用域内类当作全局工具类。
    result.root.walkAtRules("layer", (rule) => { if (rule.nodes) rule.replaceWith(...rule.nodes); else rule.remove(); });
    await writeFile(path.join(dist, "styles.css"), result.root.toString());
    if (name === "content-ui") {
      const require = createRequire(path.join(directory, "package.json"));
      const katexDirectory = path.dirname(require.resolve("katex/package.json"));
      await cp(path.join(katexDirectory, "dist/fonts"), path.join(dist, "fonts"), { recursive: true });
      await cp(path.join(katexDirectory, "LICENSE"), path.join(dist, "KaTeX-LICENSE.txt"));
    }
    for (const match of result.root.toString().matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
      if (/^(?:data:|https?:|#)/.test(match[1])) continue;
      const asset = path.resolve(dist, match[1]);
      if (!asset.startsWith(dist + path.sep)) throw new Error(`CSS 资源越过包边界：${match[1]}`);
      await access(asset);
    }
  }
  console.log(`built @jas/${name}`);
}
