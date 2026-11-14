import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { SECTION_IDS, parseSiteConfig, visibleNavigation, readPublication, normalizeContentMetadata, createContentDraft, parseMarkdownContent, serializeContentDocument, type SiteConfig } from "../packages/content-core/src/index";
import { atomicWrite, fileVersion, withWorkspaceLock, writeVersioned } from "../packages/site-tools/src/files";
import { readSite, loadWorkspace, validateWorkspace, PHOTO_FILE, SITE_FILE } from "../packages/site-tools/src/workspace";
import { migrateWorkspace } from "../packages/site-tools/src/migrate";
import { finalizeExport, prepareExport } from "../packages/site-tools/src/export";
import { savePhotos, recoverMediaCleanup } from "../packages/site-tools/src/media";
import { inspectPublication, publishWorkspace, publicationState } from "../packages/site-tools/src/publish";
import { runCommand, type CommandRunner } from "../packages/site-tools/src/process";
import { migrateSiteConfig } from "../packages/content-core/src/site-migration";

function site(): SiteConfig {
  return { name: "Synthetic site", description: "Synthetic description", footer: "Synthetic author", home: { motto: "Synthetic", description: "" }, sections: Object.fromEntries(SECTION_IDS.map((id) => [id, { title: id, description: "", enabled: true }])) as SiteConfig["sections"], navigation: [{ target: "home", label: "Home", visible: true }, { target: "notes", label: "Notes", visible: true }], noteCategories: [], comments: { enabled: false, repo: "", repoId: "", category: "", categoryId: "" } };
}
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jas-site-"));
  for (const dir of ["content/photography", "content/pages", "content/notes", "public/media", "public/photography", ".run"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, "content/site.json"), JSON.stringify(site(), null, 2) + "\n");
  fs.writeFileSync(path.join(root, PHOTO_FILE), "[]\n");
  return root;
}
function write(root: string, relative: string, text: string) { fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true }); fs.writeFileSync(path.join(root, relative), text); }
function git(root: string, ...args: string[]) { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }

test("site configuration separates navigation visibility from public routes and rejects bad targets", () => {
  const config = site();
  config.navigation.push({ target: "page:about", label: "About", visible: true });
  assert.equal(visibleNavigation(config, ["about"]).length, 3);
  assert.deepEqual(visibleNavigation(config, ["about"])[2], { target: "page:about", href: "/pages/about", label: "About" });
  config.sections.notes.enabled = false;
  assert.deepEqual(visibleNavigation(config, []).map((item) => item.href), ["/"]);
  for (const candidate of [{ ...site(), name: "" }, { ...site(), extra: true }, { ...site(), navigation: [...site().navigation, site().navigation[0]] }, { ...site(), navigation: [{ target: "page:../escape", label: "bad", visible: true }] }, { ...site(), sections: { ...site().sections, home: { title: "Home", description: "", enabled: false } } }]) assert.throws(() => parseSiteConfig(candidate));
});

test("时间线栏目只通过显式迁移加入旧配置", () => {
  const { timeline: _timeline, ...sections } = site().sections;
  const previous = { ...site(), sections };
  assert.throws(() => parseSiteConfig(previous));
  assert.deepEqual(migrateSiteConfig(previous).sections.timeline, { title: "发布时间线", description: "", enabled: true });
  assert.deepEqual(migrateSiteConfig(previous).navigation, previous.navigation);
});

test("home upgrade is explicit, rejects unknown fields and preserves unfinished draft text", () => {
  const previous = { ...site(), home: { heading: "A，", accent: "B", description: "Retained", notesDescription: "Old notes", projectsDescription: "Old projects" } };
  assert.throws(() => parseSiteConfig(previous));
  assert.deepEqual(migrateSiteConfig(previous).home, { motto: "A，B", description: "Retained" });
  assert.deepEqual(migrateSiteConfig(site()), site());
  assert.throws(() => migrateSiteConfig({ ...previous, home: { ...previous.home, extra: "keep" } }));
  assert.equal(migrateSiteConfig({ ...previous, home: { ...previous.home, heading: "", accent: "" } }, { draft: true }).home.motto, "");
});

test("home migration backs up recovery records, rebases matching versions and is repeatable", async () => {
  const root = workspace();
  const backup = fs.mkdtempSync(path.join(os.tmpdir(), "jas-home-backup-"));
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "jas-home-state-"));
  try {
    const previous = { ...site(), home: { heading: "Retained", accent: " motto", description: "Retained introduction", notesDescription: "Notes", projectsDescription: "Projects" } };
    const original = JSON.stringify(previous, null, 2) + "\n";
    write(root, "content/site.json", original);
    const key = `site:${fs.realpathSync(root)}`;
    const record = { site: { ...previous, name: "Unsaved name", home: { ...previous.home, heading: "Unsaved" } }, photos: [], siteVersion: fileVersion(path.join(root, "content/site.json")), photoVersion: "retained-photo-version" };
    const records = { [key]: record, unrelated: { content: "retained" } };
    fs.writeFileSync(path.join(state, "editor-drafts.json"), JSON.stringify(records));
    await migrateWorkspace(root, backup, undefined, { editorStateDirectory: state });
    assert.equal(fs.readFileSync(path.join(backup, "content/site.json"), "utf8"), original);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(backup, "editor-drafts.json"), "utf8")), records);
    assert.equal(readSite(root).home.motto, "Retained motto");
    const restored = JSON.parse(fs.readFileSync(path.join(state, "editor-drafts.json"), "utf8"));
    assert.equal(restored[key].site.home.motto, "Unsaved motto");
    assert.equal(restored[key].site.name, "Unsaved name");
    assert.equal(restored[key].siteVersion, fileVersion(path.join(root, "content/site.json")));
    assert.equal(restored[key].photoVersion, record.photoVersion);
    assert.deepEqual(restored.unrelated, records.unrelated);
    assert.deepEqual(await migrateWorkspace(root, backup, undefined, { editorStateDirectory: state }), []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(backup, "migration.json"), "utf8")).changed, ["content/site.json", "editor-drafts.json"]);
    restored[key].siteVersion = "stale-before-upgrade";
    fs.writeFileSync(path.join(state, "editor-drafts.json"), JSON.stringify(restored));
    await migrateWorkspace(root, backup, undefined, { editorStateDirectory: state });
    assert.equal(JSON.parse(fs.readFileSync(path.join(state, "editor-drafts.json"), "utf8"))[key].siteVersion, "stale-before-upgrade");
  } finally { for (const directory of [root, backup, state]) fs.rmSync(directory, { recursive: true }); }
});

test("migration rejects a backup directory owned by another workspace before changing content", async () => {
  const first = workspace(); const second = workspace();
  const backup = fs.mkdtempSync(path.join(os.tmpdir(), "jas-owned-backup-"));
  try {
    await migrateWorkspace(first, backup);
    const file = path.join(second, "content/site.json"); const before = fs.readFileSync(file);
    await assert.rejects(migrateWorkspace(second, backup), /不属于当前工作区/);
    assert.deepEqual(fs.readFileSync(file), before);
  } finally { for (const directory of [first, second, backup]) fs.rmSync(directory, { recursive: true }); }
});

test("publication is explicit and independent of roadmap status; draft creation preserves YAML", () => {
  assert.throws(() => readPublication(undefined));
  const missing = normalizeContentMetadata({ title: "unfinished", status: "active" }, "roadmap");
  assert.equal(missing.metadata.publication, undefined);
  assert.match(missing.issues.join(" "), /publication/);
  const raw = '\uFEFF---\r\n# keep\r\ntitle: Synthetic\r\npublication: published\r\ncustom: yes\r\n---\r\nbody\r\n';
  const draft = createContentDraft(raw, "page");
  assert.ok(draft.startsWith('\uFEFF---\r\n# keep'));
  assert.ok(draft.endsWith('body\r\n'));
  assert.equal(parseMarkdownContent(draft, "page").metadata.publication, "draft");
  const parsed = parseMarkdownContent('---\ntitle: Synthetic\npublication: draft\ndisplay:\n  cover: { src: /media/test.webp, alt: Synthetic, width: 20, height: 10 }\n---\nbody', "page");
  const saved = serializeContentDocument({ ...parsed, type: "page", frontmatterBlock: parsed.frontmatterBlock!, metadata: { ...parsed.metadata, display: { cover: undefined, toc: false } }, metadataDirty: true });
  assert.deepEqual(parseMarkdownContent(saved, "page").issues, []);
  assert.equal(parseMarkdownContent(saved, "page").metadata.display?.cover, undefined);
});

test("migration preserves creative content, backs up original bytes and is repeatable", async () => {
  const root = workspace(); const backup = fs.mkdtempSync(path.join(os.tmpdir(), "jas-site-backup-"));
  try {
    const original = '\uFEFF---\r\n# keep\r\ntitle: Synthetic\r\ncustom: { keep: true }\r\n---\r\nRetained body\r\n';
    write(root, "content/notes/retained.md", original);
    const changed = await migrateWorkspace(root, backup, site());
    assert.deepEqual(changed, ["content/notes/retained.md"]);
    assert.equal(fs.readFileSync(path.join(backup, "content/notes/retained.md"), "utf8"), original);
    const current = fs.readFileSync(path.join(root, "content/notes/retained.md"), "utf8");
    assert.ok(current.includes('# keep\r\n'));
    assert.ok(current.endsWith('Retained body\r\n'));
    assert.deepEqual(await migrateWorkspace(root, backup, site()), []);
    validateWorkspace(root);
  } finally { fs.rmSync(root, { recursive: true }); fs.rmSync(backup, { recursive: true }); }
});

test("versioned saves reject external changes and workspace locks reject competing writes", async () => {
  const root = workspace();
  try {
    const file = path.join(root, "content/site.json"); const version = fileVersion(file);
    write(root, "content/site.json", JSON.stringify({ ...site(), name: "Changed externally" }));
    assert.throws(() => writeVersioned(file, site(), version), /变化/);
    assert.equal(readSite(root).name, "Changed externally");
    let release!: () => void;
    const first = withWorkspaceLock(root, () => new Promise<void>((resolve) => { release = resolve; }));
    await assert.rejects(withWorkspaceLock(root, () => undefined), (error: unknown) => (error as NodeJS.ErrnoException).code === "EEXIST");
    release(); await first;
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("exports remove disabled routes and unused copied assets without deleting route payloads", () => {
  const root = workspace(); const previous = process.env.GITHUB_SHA;
  try {
    const config = site(); config.sections.notes.enabled = false;
    write(root, "content/site.json", JSON.stringify(config));
    prepareExport(root);
    write(root, "out/index.html", '<img src="/nested/media/public.webp"><img src="/photography/visible/full.webp">');
    write(root, "out/notes.html", "stale content"); write(root, "out/notes/old.html", "stale detail");
    write(root, "public/media/public.webp", "public"); write(root, "public/media/draft.webp", "draft");
    write(root, "public/photography/visible/full.webp", "visible"); write(root, "public/photography/draft/full.webp", "draft");
    write(root, "out/media/public.webp", "public"); write(root, "out/media/draft.webp", "draft");
    write(root, "out/photography/visible/full.webp", "visible"); write(root, "out/photography/draft/full.webp", "draft");
    write(root, "out/photography/__next._tree.txt", "route tree");
    write(root, "out/photography/__next._full.txt", "route payload");
    process.env.GITHUB_SHA = "a".repeat(40);
    finalizeExport(root);
    assert.equal(fs.existsSync(path.join(root, "out/notes.html")), false);
    assert.equal(fs.existsSync(path.join(root, "out/notes")), false);
    assert.equal(fs.existsSync(path.join(root, "out/media/public.webp")), true);
    assert.equal(fs.existsSync(path.join(root, "out/media/draft.webp")), false);
    assert.equal(fs.readFileSync(path.join(root, "out/photography/visible/full.webp"), "utf8"), "visible");
    assert.equal(fs.existsSync(path.join(root, "out/photography/draft/full.webp")), false);
    assert.equal(fs.readFileSync(path.join(root, "out/photography/__next._tree.txt"), "utf8"), "route tree");
    assert.equal(fs.readFileSync(path.join(root, "out/photography/__next._full.txt"), "utf8"), "route payload");
    assert.equal(fs.readFileSync(path.join(root, "public/photography/draft/full.webp"), "utf8"), "draft");
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, "out/deployment.json"), "utf8")).sourceSha, "a".repeat(40));
  } finally { if (previous === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = previous; fs.rmSync(root, { recursive: true }); }
});

test("photo deletion protects references and resumes committed cleanup without deleting changed files", async () => {
  const root = workspace();
  try {
    const src = "/photography/synthetic/full.webp";
    write(root, "public" + src, "synthetic image");
    const photos = [{ id: "synthetic", title: "Synthetic", alt: "Synthetic", publication: "draft", images: [{ src, width: 2, height: 1 }] }];
    write(root, PHOTO_FILE, JSON.stringify(photos));
    write(root, "content/notes/ref.md", `---\npublication: draft\n---\n![retained](${src})`);
    const version = fileVersion(path.join(root, PHOTO_FILE));
    await assert.rejects(savePhotos(root, [], version), /引用/);
    assert.equal(loadWorkspace(root).photos.length, 1);
    fs.unlinkSync(path.join(root, "content/notes/ref.md"));
    const assetVersion = fileVersion(path.join(root, "public" + src));
    write(root, ".run/media-deletions.json", JSON.stringify({ expected: version, entries: [{ src, version: assetVersion }] }));
    write(root, PHOTO_FILE, "[]");
    write(root, "public" + src, "changed creative output");
    assert.throws(() => recoverMediaCleanup(root), /已被修改/);
    write(root, "public" + src, "synthetic image");
    recoverMediaCleanup(root);
    assert.equal(fs.existsSync(path.join(root, "public" + src)), false);
    assert.equal(fs.existsSync(path.join(root, ".run/media-deletions.json")), false);
  } finally { fs.rmSync(root, { recursive: true }); }
});

function publishFixture() {
  const root = workspace(); const remote = fs.mkdtempSync(path.join(os.tmpdir(), "jas-remote-")); const stateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jas-publish-state-"));
  git(remote, "init", "--bare"); git(root, "init", "-b", "master"); git(root, "config", "user.name", "Synthetic"); git(root, "config", "user.email", "synthetic@example.invalid");
  write(root, ".gitignore", ".run/\nout/\n"); write(root, "src/index.ts", "export {};\n");
  git(root, "add", "."); git(root, "commit", "-m", "Synthetic baseline"); git(root, "remote", "add", "origin", remote); git(root, "push", "-u", "origin", "master");
  const runner: CommandRunner = async (command, args, cwd) => {
    if (command === "git" && args.join(" ") === "remote get-url origin") return "git@github.com:synthetic/site.git";
    if (command === "npm") return "Synthetic build completed";
    if (command === "gh") {
      if (args[0] === "auth") return "Synthetic authenticated account";
      if (args[0] === "repo") return JSON.stringify({ nameWithOwner: "synthetic/site", defaultBranchRef: { name: "master" } });
      if (args[0] === "api") return JSON.stringify([{ sha: "b".repeat(40), commit: { message: `deploy: ${git(root, "rev-parse", "HEAD")}` } }]);
      if (args[0] === "run") return JSON.stringify([{ databaseId: args.includes("deploy.yml") ? 1 : 2, status: "completed", conclusion: "success", url: "https://github.com/synthetic/site/actions/runs/1" }]);
      throw new Error("Unexpected GitHub command");
    }
    return runCommand(command, args, cwd);
  };
  return { root, remote, stateDirectory, runner, cleanup() { for (const dir of [root, remote, stateDirectory]) fs.rmSync(dir, { recursive: true }); } };
}

test("发布构建前保存首次时间并纳入提交，构建失败后重试保留原时间", { timeout: 60_000 }, async () => {
  const fixture = publishFixture();
  try {
    const file = "content/notes/new.md";
    write(fixture.root, file, "---\npublication: published\ntitle: New\n---\nRetained body\n");
    let first = "";
    const failing: CommandRunner = async (command, args, cwd) => {
      if (command === "npm") {
        first = parseMarkdownContent(fs.readFileSync(path.join(fixture.root, file), "utf8"), "note").metadata.publishedAt!;
        assert.ok(first.endsWith("Z"));
        throw new Error("Synthetic build failure");
      }
      return fixture.runner(command, args, cwd);
    };
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, () => {}, { run: failing, verify: async () => true }), /build failure/);
    assert.equal(git(fixture.root, "log", "-1", "--format=%s"), "Synthetic baseline");
    await publishWorkspace(fixture.root, fixture.stateDirectory, () => {}, { run: fixture.runner, verify: async () => true });
    assert.equal(parseMarkdownContent(git(fixture.root, "show", `HEAD:${file}`), "note").metadata.publishedAt, first);
    write(fixture.root, file, fs.readFileSync(path.join(fixture.root, file), "utf8") + "Edited body\n");
    await publishWorkspace(fixture.root, fixture.stateDirectory, () => {}, { run: fixture.runner, verify: async () => true });
    assert.equal(parseMarkdownContent(git(fixture.root, "show", `HEAD:${file}`), "note").metadata.publishedAt, first);
  } finally { fixture.cleanup(); }
});

test("素材恢复先核对整批记录，后续损坏项不会导致前面的原图被删除", () => {
  const root = workspace();
  try {
    const src = "/photography/retained/full.webp";
    write(root, `public${src}`, "creative output");
    for (const later of [{ src: "/photography/../media/unrelated.webp", version: "a".repeat(64) }, { src: "/photography/changed/full.webp", version: "a".repeat(64) }]) {
      write(root, "public/photography/changed/full.webp", "changed output");
      write(root, ".run/media-deletions.json", JSON.stringify({ expected: "b".repeat(64), entries: [{ src, version: fileVersion(path.join(root, `public${src}`)) }, later] }));
      assert.throws(() => recoverMediaCleanup(root), /无效|已被修改/);
      assert.equal(fs.readFileSync(path.join(root, `public${src}`), "utf8"), "creative output");
    }
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("publication stops before mutation when source files are dirty", async () => {
  const fixture = publishFixture();
  try {
    const before = git(fixture.root, "rev-parse", "HEAD");
    write(fixture.root, "src/index.ts", "changed source");
    const inspection = await inspectPublication(fixture.root, fixture.runner);
    assert.match(inspection.blockers.join(" "), /src\/index/);
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: fixture.runner }), /非内容/);
    assert.equal(git(fixture.root, "rev-parse", "HEAD"), before);
  } finally { fixture.cleanup(); }
});

test("发布恢复拒绝损坏状态，不执行 Git 或覆盖原记录", async () => {
  const fixture = publishFixture();
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Pending content" }));
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: async (command, args, cwd) => {
      if (command === "git" && args[0] === "push") throw new Error("Synthetic network failure");
      return fixture.runner(command, args, cwd);
    } }), /network/);
    const checkpoint = path.join(fixture.stateDirectory, fs.readdirSync(fixture.stateDirectory)[0]);
    const damaged = { ...publicationState(fixture.root, fixture.stateDirectory), sourceSha: "invalid-sha" };
    fs.writeFileSync(checkpoint, JSON.stringify(damaged));
    let calls = 0;
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: async () => { calls++; return ""; } }), /无效状态/);
    assert.equal(calls, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(checkpoint, "utf8")), damaged);
  } finally { fixture.cleanup(); }
});

test("publication resumes a committed push failure without rebuilding or committing new local edits", async () => {
  const fixture = publishFixture(); let pushes = 0; let builds = 0;
  const runner: CommandRunner = async (command, args, cwd) => {
    if (command === "npm") builds++;
    if (command === "git" && args[0] === "push" && pushes++ === 0) throw new Error("Synthetic network failure");
    return fixture.runner(command, args, cwd);
  };
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Public change" }));
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner }), /network/);
    const committed = git(fixture.root, "rev-parse", "HEAD");
    assert.equal(publicationState(fixture.root, fixture.stateDirectory)?.sourceSha, committed);
    write(fixture.root, "content/notes/later.md", "---\npublication: draft\ntitle: Later draft\n---\nretained draft");
    const result = await publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner, wait: async () => {}, verify: async () => true });
    assert.equal(result.phase, "complete"); assert.equal(result.sourceSha, committed); assert.equal(builds, 1);
    assert.equal(git(fixture.root, "rev-parse", "HEAD"), committed);
    assert.ok(fs.readFileSync(path.join(fixture.root, "content/notes/later.md"), "utf8").includes("retained draft"));
    assert.equal(git(fixture.root, "status", "--porcelain", "--untracked-files=all").includes("later.md"), true);
  } finally { fixture.cleanup(); }
});

test("publication recovers the gap between Git commit and saved checkpoint", async () => {
  const fixture = publishFixture(); let crash = true;
  const runner: CommandRunner = async (command, args, cwd) => {
    const result = await fixture.runner(command, args, cwd);
    if (command === "git" && args[0] === "commit" && crash) { crash = false; throw new Error("Synthetic process interruption"); }
    return result;
  };
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Public change" }));
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner }), /interruption/);
    const committed = git(fixture.root, "rev-parse", "HEAD");
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Later unsaved publication" }));
    const result = await publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner, wait: async () => {}, verify: async () => true });
    assert.equal(result.sourceSha, committed); assert.equal(result.phase, "complete");
    assert.equal(git(fixture.root, "rev-list", "--count", "HEAD"), "2");
    assert.equal(readSite(fixture.root).name, "Later unsaved publication");
  } finally { fixture.cleanup(); }
});

test("恢复提交时拒绝 Git hook 额外加入的文件", async () => {
  const fixture = publishFixture();
  const remoteBefore = git(fixture.remote, "rev-parse", "master");
  const runner: CommandRunner = async (command, args, cwd) => {
    const result = await fixture.runner(command, args, cwd);
    if (command === "git" && args[0] === "commit") throw new Error("Synthetic process interruption");
    return result;
  };
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Build snapshot" }));
    fs.writeFileSync(path.join(fixture.root, ".git/hooks/pre-commit"), '#!/bin/sh\nprintf "unexpected" > injected.txt\ngit add injected.txt\n', { mode: 0o700 });
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner }), /interruption/);
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: fixture.runner, wait: async () => {}, verify: async () => true }), /构建快照不一致/);
    assert.equal(git(fixture.remote, "rev-parse", "master"), remoteBefore);
    assert.equal(publicationState(fixture.root, fixture.stateDirectory)?.phase, "review_required");
  } finally { fixture.cleanup(); }
});

test("Pages failure and an unconfirmed online version never become publication success", async () => {
  for (const pagesFailure of [true, false]) {
    const fixture = publishFixture();
    const runner: CommandRunner = async (command, args, cwd) => command === "gh" && args[0] === "run" && args.includes("pages-build-deployment") && pagesFailure ? JSON.stringify([{ databaseId: 2, status: "completed", conclusion: "failure", url: "https://github.com/synthetic/site/actions/runs/2" }]) : fixture.runner(command, args, cwd);
    try {
      write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Public change" }));
      await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner, wait: async () => {}, verify: async () => false }), /未成功|尚未确认/);
      assert.equal(publicationState(fixture.root, fixture.stateDirectory)?.phase, "unconfirmed");
    } finally { fixture.cleanup(); }
  }
});

test("content changes during a build stop publication before a commit", async () => {
  const fixture = publishFixture();
  const original = git(fixture.root, "rev-parse", "HEAD");
  const runner: CommandRunner = async (command, args, cwd) => {
    if (command === "npm") write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Edited during build" }));
    return fixture.runner(command, args, cwd);
  };
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Build snapshot" }));
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner }), /构建期间内容发生变化/);
    assert.equal(git(fixture.root, "rev-parse", "HEAD"), original);
    assert.equal(readSite(fixture.root).name, "Edited during build");
  } finally { fixture.cleanup(); }
});

test("a Git hook cannot replace the validated snapshot and have it pushed", async () => {
  const fixture = publishFixture(); const remoteBefore = git(fixture.remote, "rev-parse", "master");
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Build snapshot" }));
    const hook = path.join(fixture.root, ".git/hooks/pre-commit");
    fs.writeFileSync(hook, '#!/bin/sh\nprintf "hook replacement" > content/site.json\ngit add content/site.json\n', { mode: 0o700 });
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: fixture.runner }), /构建快照不一致/);
    assert.equal(publicationState(fixture.root, fixture.stateDirectory)?.phase, "review_required");
    assert.equal(git(fixture.remote, "rev-parse", "master"), remoteBefore);
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: fixture.runner }), /不会推送/);
  } finally { fixture.cleanup(); }
});

test("explicit workflow retry resumes the same source commit", async () => {
  const fixture = publishFixture(); let retried = false;
  const runner: CommandRunner = async (command, args, cwd) => {
    if (command === "gh" && args[0] === "run" && args[1] === "rerun") { retried = true; return ""; }
    if (command === "gh" && args[0] === "api" && args[1].includes("actions/runs/")) return JSON.stringify({ run_attempt: retried ? 2 : 1, status: "completed", conclusion: retried ? "success" : "failure" });
    if (command === "gh" && args[0] === "run" && args.includes("deploy.yml") && !retried) return JSON.stringify([{ databaseId: 1, status: "completed", conclusion: "failure", url: "https://github.com/synthetic/site/actions/runs/1" }]);
    return fixture.runner(command, args, cwd);
  };
  try {
    write(fixture.root, "content/site.json", JSON.stringify({ ...site(), name: "Build snapshot" }));
    await assert.rejects(publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner, wait: async () => {} }), /未成功/);
    const committed = git(fixture.root, "rev-parse", "HEAD");
    const result = await publishWorkspace(fixture.root, fixture.stateDirectory, undefined, { run: runner, wait: async () => {}, retryFailed: true, verify: async () => true });
    assert.equal(result.phase, "complete"); assert.equal(result.sourceSha, committed); assert.equal(retried, true);
    assert.equal(git(fixture.root, "rev-list", "--count", "HEAD"), "2");
  } finally { fixture.cleanup(); }
});

test("笔记分类摘要包含草稿，保存分类前保护文档引用，发布时拒绝悬空分类", () => {
  const root = workspace();
  const config = site();
  config.noteCategories = [{ id: "math", name: "数学" }, { id: "calculus", name: "高等数学", parentId: "math" }];
  const cli = path.resolve("packages/site-tools/src/cli.ts");
  const loader = path.resolve("node_modules/tsx/dist/loader.mjs");
  try {
    write(root, SITE_FILE, JSON.stringify(config));
    const original = "---\npublication: draft\ntitle: 学习文档\ncategory: calculus\n---\n保留正文\n";
    write(root, "content/notes/example.md", original);
    assert.deepEqual(loadWorkspace(root).notes, [{ path: "content/notes/example.md", title: "学习文档", publication: "draft", category: "calculus" }]);
    const before = fs.readFileSync(path.join(root, SITE_FILE), "utf8");
    const input = { site: { ...config, noteCategories: [] }, expectedVersion: fileVersion(path.join(root, SITE_FILE)), stateDirectory: path.join(root, ".run") };
    assert.throws(() => execFileSync(process.execPath, ["--import", loader, cli, "save_site"], { cwd: root, input: JSON.stringify(input), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }), (error: unknown) => {
      assert.match(String((error as { stdout: string }).stdout), /example\.md.*calculus/);
      return true;
    });
    assert.equal(fs.readFileSync(path.join(root, SITE_FILE), "utf8"), before);
    const renamed = { ...config, noteCategories: config.noteCategories.map((category) => category.id === "calculus" ? { ...category, name: "微积分" } : category) };
    const saved = JSON.parse(execFileSync(process.execPath, ["--import", loader, cli, "save_site"], { cwd: root, input: JSON.stringify({ ...input, site: renamed }), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
    assert.equal(saved.type, "result");
    assert.equal(saved.protocol, 2);
    assert.equal(readSite(root).noteCategories[1].name, "微积分");
    assert.equal(fs.readFileSync(path.join(root, "content/notes/example.md"), "utf8"), original);
    write(root, SITE_FILE, JSON.stringify({ ...config, noteCategories: [] }));
    assert.doesNotThrow(() => loadWorkspace(root));
    assert.doesNotThrow(() => validateWorkspace(root));
    write(root, "content/notes/example.md", original.replace("publication: draft", "publication: published"));
    assert.throws(() => validateWorkspace(root), /example\.md.*calculus/);
  } finally { fs.rmSync(root, { recursive: true }); }
});
