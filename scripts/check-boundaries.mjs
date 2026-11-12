import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const packages = await readdir(new URL("../packages/", import.meta.url));
const failures = [];
for (const name of packages) {
  const source = new URL(`../packages/${name}/src/`, import.meta.url);
  const files = await readdir(source, { recursive: true });
  for (const file of files.filter((file) => /\.(ts|tsx)$/.test(file))) {
    const text = await readFile(new URL(file, source), "utf8");
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      let specifier;
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) specifier = node.moduleSpecifier;
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
      if (specifier && ts.isStringLiteral(specifier)) {
        const value = specifier.text;
        const forbidden = value.startsWith("@/") || value.startsWith("@jasblog/") || /(?:^|\/)(GT|JasBlog|JasBlogEditor)(?:\/|$)/.test(value)
          || (value.startsWith(".") && !path.resolve(source.pathname, path.dirname(file), value).startsWith(source.pathname))
          || /^(?:next(?:\/|$)|@tauri-apps\/|zustand(?:\/|$))/.test(value)
          || (name !== "site-tools" && /^(?:node:|fs(?:\/|$)|path$)/.test(value))
          || (name.endsWith("-core") && /^react(?:\/|$)/.test(value));
        if (forbidden) failures.push(`${name}/${file}: ${value}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
}
if (failures.length) throw new Error(failures.join("\n"));
console.log("Public package boundaries passed.");
