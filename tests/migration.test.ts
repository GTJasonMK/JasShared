import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { migrateGraphFile } from "../scripts/migrate-graphs.mjs";

test("explicit migration reports changes, creates a byte-exact backup and is repeatable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "jas-migrate-"));
  try {
    const filename = path.join(root, "graph.md");
    const original = '\uFEFF---\r\n# retained\r\ntitle: 图谱\r\n---\r\n正文\r\n```graph\r\n{"nodes":[],"edges":[]}\r\n```\r\n结尾\r\n';
    await writeFile(filename, original);
    assert.equal((await migrateGraphFile(filename, { timestamp: 1 })).changed, true);
    assert.equal(await readFile(filename, "utf8"), original);
    const applied = await migrateGraphFile(filename, { timestamp: 1, apply: true });
    assert.equal(await readFile(applied.backup!, "utf8"), original);
    const result = await readFile(filename, "utf8");
    assert.ok(result.startsWith('\uFEFF---\r\n# retained\r\ntitle: 图谱\r\n---\r\n正文\r\n'));
    assert.ok(result.endsWith('```\r\n结尾\r\n'));
    assert.equal((await migrateGraphFile(filename, { timestamp: 2, apply: true })).changed, false);
    await writeFile(filename, '```graph\nnot json\n```');
    await assert.rejects(migrateGraphFile(filename, { timestamp: 3, apply: true }));
    assert.equal(await readFile(filename, "utf8"), '```graph\nnot json\n```');
  } finally { await rm(root, { recursive: true, force: true }); }
});
