import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { parsePhotos } from "../packages/content-core/src/photography";
import { readPhotos as getPhotos } from "../packages/site-tools/src/workspace";
import { importPhoto } from "../packages/site-tools/src/media";

const photo = () => ({ id: "test", title: "山间", alt: "云层下的山脊", publication: "published", images: [{ src: "/photography/test/full.webp", width: 1200, height: 800 }] });
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jas-photo-"));
  fs.mkdirSync(path.join(root, "content/photography"), { recursive: true });
  fs.writeFileSync(path.join(root, "content/photography/photos.json"), "[]\n");
  return root;
}

test("摄影清单拒绝重复 ID、坏日期、未知字段、错误尺寸与越界图片地址", () => {
  assert.deepEqual(parsePhotos([]), []);
  assert.equal(parsePhotos([{ ...photo(), takenAt: "2024-02-29" }])[0].takenAt, "2024-02-29");
  const asset = (src: string, width = 1200) => ({ ...photo(), images: [{ src, width, height: 800 }] });
  assert.equal(parsePhotos([asset("https://images.example.org/photo.webp")])[0].id, "test");
  for (const value of [
    {}, [photo(), photo()], [{ ...photo(), id: "../escape" }], [asset("/photography/test/full.webp", 0)],
    [{ ...photo(), takenAt: "2026-02-30" }], [{ ...photo(), caption: "保留但尚不支持的字段" }],
    [asset("/photography/../../private")], [asset("javascript:alert(1)")],
    [{ ...photo(), alt: "" }], [asset("https://token:secret@example.org/image.jpg")],
    [{ ...photo(), images: [] }], [{ ...photo(), images: [...photo().images, ...photo().images] }],
  ]) assert.throws(() => parsePhotos(value));
});

test("导入保留原片、纠正方向、限制尺寸并删除 EXIF，重复导入不覆盖作品", async () => {
  const root = workspace();
  try {
    const inputPath = path.join(root, "原片.jpg");
    await sharp({ create: { width: 3200, height: 1800, channels: 3, background: "#809080" } }).jpeg().withMetadata({ orientation: 6 }).toFile(inputPath);
    const original = fs.readFileSync(inputPath);
    const imported = await importPhoto({ inputPath, title: "山间", category: "风景", takenAt: "2026-11-12", root });
    assert.equal(imported.id, "原片");
    assert.equal(imported.publication, "draft");
    const largest = imported.images[imported.images.length - 1];
    assert.deepEqual([largest.width, largest.height], [1440, 2560]);
    const full = await sharp(path.join(root, "public", largest.src)).metadata();
    const thumbnail = await sharp(path.join(root, "public", imported.images[1].src)).metadata();
    assert.equal(full.exif, undefined);
    assert.equal(full.orientation, undefined);
    assert.deepEqual([thumbnail.width, thumbnail.height], [540, 960]);
    assert.deepEqual(imported.images.map(({ width, height }) => [width, height]), [[360, 640], [540, 960], [1440, 2560]]);
    assert.deepEqual(fs.readFileSync(inputPath), original);
    const manifest = fs.readFileSync(path.join(root, "content/photography/photos.json"), "utf8");
    await assert.rejects(importPhoto({ inputPath, title: "不能覆盖", root }), /已存在/);
    assert.equal(fs.readFileSync(path.join(root, "content/photography/photos.json"), "utf8"), manifest);
    assert.equal(getPhotos(root).length, 1);
    assert.equal(fs.existsSync(path.join(root, "content/photography/photos.json.lock")), false);
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("损坏图片导入失败后保留清单，已有作品目录与缺失图片不会被忽略", async () => {
  const root = workspace();
  try {
    const inputPath = path.join(root, "broken.jpg");
    fs.writeFileSync(inputPath, "not an image");
    await assert.rejects(importPhoto({ inputPath, title: "坏图片", root }));
    assert.equal(fs.readFileSync(path.join(root, "content/photography/photos.json"), "utf8"), "[]\n");
    assert.equal(fs.existsSync(path.join(root, "content/photography/photos.json.lock")), false);
    await sharp({ create: { width: 30, height: 20, channels: 3, background: "#809080" } }).jpeg().toFile(inputPath);
    const existing = path.join(root, "public/photography/broken");
    fs.mkdirSync(existing, { recursive: true });
    fs.writeFileSync(path.join(existing, "retained.txt"), "创作成果");
    await assert.rejects(importPhoto({ inputPath, title: "已有目录", root }), /EEXIST/);
    assert.equal(fs.readFileSync(path.join(existing, "retained.txt"), "utf8"), "创作成果");
    fs.writeFileSync(path.join(root, "content/photography/photos.json"), JSON.stringify([photo()]));
    assert.throws(() => getPhotos(root), /文件不存在/);
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("并发导入会明确拒绝竞争操作，清单不会丢失已完成作品", async () => {
  const root = workspace();
  try {
    const inputPath = path.join(root, "sample.jpg");
    await sharp({ create: { width: 60, height: 40, channels: 3, background: "#809080" } }).jpeg().toFile(inputPath);
    const results = await Promise.allSettled([
      importPhoto({ inputPath, id: "first", title: "第一张", root }),
      importPhoto({ inputPath, id: "second", title: "第二张", root }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.deepEqual(getPhotos(root).map((item) => item.id), ["first"]);
    assert.equal(getPhotos(root)[0].images.length, 1);
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("细长图片不生成宽度重复的响应式版本", async () => {
  const root = workspace();
  try {
    const thin = path.join(root, "thin.png");
    await sharp({ create: { width: 1, height: 1000, channels: 3, background: "#809080" } }).png().toFile(thin);
    const imported = await importPhoto({ inputPath: thin, title: "细长图片", root });
    assert.equal(imported.images.length, 1);
    assert.deepEqual([imported.images[0].width, imported.images[0].height], [1, 1000]);
    assert.deepEqual(fs.readdirSync(path.join(root, "public/photography/thin")), ["full.webp"]);
  } finally { fs.rmSync(root, { recursive: true }); }
});

test("相同导入请求恢复时复用已生成图片，并核对输入变化", async () => {
  const root = workspace();
  try {
    const inputPath = path.join(root, "resume.jpg");
    await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "#809080" } }).jpeg().toFile(inputPath);
    const options = { inputPath, title: "Synthetic resume", requestId: "synthetic-resume", root };
    const original = await importPhoto(options);
    assert.equal((await importPhoto(options)).id, original.id);
    assert.equal(getPhotos(root).length, 1);
    const journal = path.join(root, ".run/import-synthetic-resume.json");
    const checkpoint = JSON.parse(fs.readFileSync(journal, "utf8")); checkpoint.complete = false;
    fs.writeFileSync(journal, JSON.stringify(checkpoint));
    fs.writeFileSync(path.join(root, "content/photography/photos.json"), "[]\n");
    const full = path.join(root, "public/photography/resume/full.webp");
    const fullTime = fs.statSync(full).mtimeMs;
    fs.unlinkSync(path.join(root, "public/photography/resume/960.webp"));
    await importPhoto(options);
    assert.equal(fs.statSync(full).mtimeMs, fullTime);
    assert.equal(getPhotos(root).length, 1);
    await assert.rejects(importPhoto({ ...options, title: "Different input" }), /绑定其他输入/);
    await sharp({ create: { width: 100, height: 100, channels: 3, background: "#ffffff" } }).jpeg().toFile(inputPath);
    await assert.rejects(importPhoto(options), /原片已变化/);
  } finally { fs.rmSync(root, { recursive: true }); }
});
