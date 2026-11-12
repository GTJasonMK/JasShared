import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { atomicWrite, withWorkspaceLock, workspaceFile } from "./files";
import { validateWorkspace } from "./workspace";
import { runCommand, type CommandRunner } from "./process";
import type { PublishState, PublishInspection } from "@jas/content-core";
export type { PublishState, PublishInspection } from "@jas/content-core";

type Reporter = (state: PublishState) => void;
const managed = (file: string) => path.posix.normalize(file) === file && (/^content\/(?:site\.json|photography\/photos\.json|(?:notes|projects|graphs|roadmaps|pages|diary)\/.+\.md)$/i.test(file) || /^public\/(?:media\/[a-f0-9]+\.webp|photography\/[^/]+\/(?:full|640|960)\.webp)$/u.test(file));
const git = (run: CommandRunner, root: string, ...args: string[]) => run("git", args, root);
const gh = (run: CommandRunner, root: string, ...args: string[]) => run("gh", args, root);

export async function inspectPublication(root: string, run: CommandRunner = runCommand): Promise<PublishInspection> {
  await run("node", ["--version"], root);
  await run("git", ["--version"], root);
  await gh(run, root, "auth", "status");
  const origin = await git(run, root, "remote", "get-url", "origin");
  const match = origin.match(/^(?:git@github\.com:|https:\/\/github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/i);
  if (!match) throw new Error("origin 必须是 GitHub SSH 地址或不含凭据的 HTTPS 地址。");
  const info = JSON.parse(await gh(run, root, "repo", "view", match[1], "--json", "nameWithOwner,defaultBranchRef"));
  const repo = String(info.nameWithOwner);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("当前远端不是有效的 GitHub 仓库。");
  const branch = String(info.defaultBranchRef.name);
  const blockers: string[] = [];
  const current = await git(run, root, "branch", "--show-current");
  if (current !== branch) blockers.push(`请切换到部署分支 ${branch}。`);
  const entries = (await git(run, root, "status", "--porcelain=v1", "-z", "--untracked-files=all")).split("\0").filter(Boolean);
  const changes: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]; const code = entry.slice(0, 2); const file = entry.slice(3);
    if (/[RC]/.test(code)) { blockers.push(`请先完成重命名或复制提交：${file}`); i++; continue; }
    if (code.includes("U") || code === "AA" || code === "DD") blockers.push(`存在合并冲突：${file}`);
    if (managed(file)) changes.push(file);
    else if (code !== "??" || /^(?:src\/|scripts\/|\.github\/|content\/|public\/|package(?:-lock)?\.json$)/.test(file)) blockers.push(`存在非内容改动：${file}`);
  }
  return { repo, branch, changes: [...new Set(changes)].sort(), blockers };
}

function fingerprint(root: string, paths: string[]): string {
  const hash = createHash("sha256");
  for (const file of paths) { hash.update(file + "\0"); const target = workspaceFile(root, file, true); if (fs.existsSync(target)) hash.update(fs.readFileSync(target)); else hash.update("[deleted]"); }
  return hash.digest("hex");
}

function gitEntries(output: string, tree = false): Record<string, string> {
  return Object.fromEntries(output.split("\0").filter(Boolean).map((entry) => { const tab = entry.indexOf("\t"); return [entry.slice(tab + 1), entry.slice(0, tab).split(" ")[tree ? 2 : 1]]; }));
}
function matchesBlobs(actual: Record<string, string>, expected: Record<string, string | null>): boolean {
  return Object.entries(expected).every(([file, hash]) => hash === null ? actual[file] === undefined : actual[file] === hash);
}

async function matchesCommit(root: string, snapshot: NonNullable<PublishState["pendingCommit"]>, run: CommandRunner): Promise<boolean> {
  const [parents, message, files, tree] = await Promise.all([
    git(run, root, "rev-list", "--parents", "-n", "1", "HEAD"),
    git(run, root, "log", "-1", "--format=%B"),
    git(run, root, "diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"),
    git(run, root, "ls-tree", "-r", "-z", "HEAD"),
  ]);
  return JSON.stringify(parents.split(" ").slice(1)) === JSON.stringify([snapshot.parentSha]) && message === snapshot.message &&
    JSON.stringify(files.split("\0").filter(Boolean).sort()) === JSON.stringify(snapshot.paths) && matchesBlobs(gitEntries(tree, true), snapshot.blobs);
}

export function publicationState(root: string, stateDirectory: string): PublishState | null {
  const file = statePath(root, stateDirectory);
  if (!fs.existsSync(file)) return null;
  const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("发布恢复记录格式无效，已停止发布。");
  const row = value as Record<string, unknown>;
  const sha = (value: unknown) => typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
  if (row.root !== fs.realpathSync(root) || typeof row.message !== "string" || !["idle", "checking", "building", "committing", "committed", "pushing", "source_workflow", "pages_workflow", "verifying", "complete", "review_required", "unconfirmed"].includes(row.phase as string) || !Number.isSafeInteger(row.updatedAt) || (row.updatedAt as number) < 0 || ["sourceSha", "deploySha"].some((key) => row[key] !== undefined && !sha(row[key])) || ["sourceRun", "pagesRun"].some((key) => row[key] !== undefined && (!Number.isSafeInteger(row[key]) || (row[key] as number) <= 0)) || (row.url !== undefined && (typeof row.url !== "string" || !/^https:\/\/[^/@\s]+(?:\/[^\s]*)?$/.test(row.url)))) throw new Error("发布恢复记录包含无效状态，已停止发布。");
  if (row.pendingCommit !== undefined) {
    const pending = row.pendingCommit as Record<string, unknown> | null;
    if (!pending || typeof pending !== "object" || !sha(pending.parentSha) || typeof pending.message !== "string" || !pending.message.trim() || !Array.isArray(pending.paths) || !pending.paths.length || pending.paths.some((file) => typeof file !== "string" || !managed(file)) || !pending.blobs || typeof pending.blobs !== "object" || Array.isArray(pending.blobs)) throw new Error("发布恢复提交记录无效，已停止发布。");
    const paths = [...new Set(pending.paths)].sort();
    const blobs = pending.blobs as Record<string, unknown>;
    if (JSON.stringify(paths) !== JSON.stringify(pending.paths) || JSON.stringify(Object.keys(blobs).sort()) !== JSON.stringify(paths) || Object.values(blobs).some((hash) => hash !== null && !sha(hash))) throw new Error("发布恢复快照不完整，已停止发布。");
    for (const relative of paths) workspaceFile(root, relative, true);
  }
  return row as unknown as PublishState;
}
function statePath(root: string, directory: string): string { return path.join(directory, `publish-${createHash("sha256").update(fs.realpathSync(root)).digest("hex")}.json`); }

export async function publishWorkspace(root: string, stateDirectory: string, report: Reporter = () => {}, options: { run?: CommandRunner; wait?: (ms: number) => Promise<void>; verify?: (url: string, sha: string) => Promise<boolean>; retryFailed?: boolean } = {}): Promise<PublishState> {
  const run = options.run ?? runCommand;
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  fs.mkdirSync(stateDirectory, { recursive: true });
  let state = publicationState(root, stateDirectory) ?? { root: fs.realpathSync(root), phase: "idle", message: "尚未发布", updatedAt: Date.now() };
  const previousPhase = state.phase;
  if (previousPhase === "complete") state = { root: state.root, phase: "idle", message: "准备新一次发布", updatedAt: Date.now() };
  const update = (phase: string, message: string) => { state = { ...state, phase, message, updatedAt: Date.now() }; atomicWrite(statePath(root, stateDirectory), JSON.stringify(state, null, 2)); report(state); };
  let requiresReview = previousPhase === "review_required";
  return withWorkspaceLock(root, async () => {
    try {
      update("checking", "检查依赖、仓库与发布范围");
      const inspection = await inspectPublication(root, run);
      if (inspection.blockers.length) throw new Error(inspection.blockers.join("\n"));
      await git(run, root, "fetch", "origin", inspection.branch);
      const head = await git(run, root, "rev-parse", "HEAD");
      const remote = await git(run, root, "rev-parse", `refs/remotes/origin/${inspection.branch}`);
      if (requiresReview) {
        if (head !== state.pendingCommit?.parentSha) throw new Error("上次提交与构建快照不一致，请先人工核对并撤回该本地提交；编辑器不会推送它。");
        state = { root: state.root, phase: "checking", message: "已撤回异常提交，重新检查内容", updatedAt: Date.now() };
        requiresReview = false;
      }
      if (previousPhase === "complete" && head === remote && state.sourceSha !== head) state = { root: state.root, phase: "checking", message: "检查当前提交", updatedAt: Date.now() };
      if (state.pendingCommit && head !== state.pendingCommit.parentSha && state.sourceSha !== head) {
        if (!await matchesCommit(root, state.pendingCommit, run)) { requiresReview = true; throw new Error("本地提交与构建快照不一致，已保留提交并阻止推送，请人工核对。"); }
        state.sourceSha = head; update("committed", "已恢复上次内容提交");
      }
      if (head !== remote && head !== state.sourceSha) throw new Error("存在未知的未推送提交或远端更新，请先在 Git 中同步。");
      const resuming = state.sourceSha === head && (head !== remote || previousPhase !== "complete");
      if (inspection.changes.length && !resuming) {
        state = { root: state.root, phase: "checking", message: "校验本次内容", updatedAt: Date.now() };
        update("checking", "校验本次内容");
        validateWorkspace(root);
        const before = fingerprint(root, inspection.changes);
        const blobs: Record<string, string | null> = {};
        for (const file of inspection.changes) blobs[file] = fs.existsSync(workspaceFile(root, file, true)) ? await git(run, root, "hash-object", `--path=${file}`, "--", file) : null;
        update("building", "校验通过，正在构建静态站点");
        await run("npm", ["run", "build"], root);
        const latest = await inspectPublication(root, run);
        if (latest.blockers.length || JSON.stringify(latest.changes) !== JSON.stringify(inspection.changes) || fingerprint(root, latest.changes) !== before) throw new Error("构建期间内容发生变化，已停止发布，请重新检查。");
        const message = `content: 更新站点内容（${inspection.changes.length} 个文件，${randomUUID()}）`;
        state.pendingCommit = { parentSha: head, paths: inspection.changes, message, blobs };
        update("committing", "保存本次内容提交");
        const pathspec = workspaceFile(root, ".run/publish-paths", true);
        atomicWrite(pathspec, inspection.changes.map((file) => `:(literal)${file}\0`).join(""));
        try { await git(run, root, "add", `--pathspec-from-file=${pathspec}`, "--pathspec-file-nul"); } finally { fs.unlinkSync(pathspec); }
        if (!matchesBlobs(gitEntries(await git(run, root, "ls-files", "--stage", "-z")), blobs)) throw new Error("暂存内容与构建快照不一致，已停止提交。");
        await git(run, root, "commit", "-m", message);
        if (!await matchesCommit(root, state.pendingCommit, run)) { requiresReview = true; throw new Error("本地提交与构建快照不一致，已保留提交并阻止推送，请人工核对。"); }
        state = { root: state.root, sourceSha: await git(run, root, "rev-parse", "HEAD"), phase: "committed", message: "内容已提交", updatedAt: Date.now() };
        update("committed", "内容已提交");
      } else if (!state.sourceSha) { state.sourceSha = head; update("committed", "查询当前提交的部署状态"); }
      if (state.sourceSha !== await git(run, root, "rev-parse", "HEAD")) throw new Error("当前提交与待恢复的发布不一致，请先检查 Git 历史。");
      if (state.sourceSha !== remote) {
        update("pushing", "正在推送内容提交");
        await git(run, root, "push", "origin", `HEAD:refs/heads/${inspection.branch}`);
      }
      const runs = async (workflow: string, sha: string) => JSON.parse(await gh(run, root, "run", "list", "-R", inspection.repo, "--workflow", workflow, "--commit", sha, "--limit", "1", "--json", "databaseId,status,conclusion,url")) as Array<{ databaseId: number; status: string; conclusion: string; url: string }>;
      const awaitRun = async (workflow: string, sha: string, kind: "sourceRun" | "pagesRun") => {
        let retried = false;
        let previousAttempt = 0;
        for (let attempt = 0; attempt < 180; attempt++) {
          const [item] = await runs(workflow, sha);
          if (item) {
            state[kind] = item.databaseId; update(kind === "sourceRun" ? "source_workflow" : "pages_workflow", item.url);
            if (item.status === "completed") {
              if (item.conclusion === "success") return;
              if (options.retryFailed && !retried) {
                const previous = JSON.parse(await gh(run, root, "api", `repos/${inspection.repo}/actions/runs/${item.databaseId}`));
                if (!Number.isSafeInteger(previous.run_attempt)) throw new Error("无法核对工作流运行次数，已停止重试。");
                previousAttempt = previous.run_attempt;
                await gh(run, root, "run", "rerun", String(item.databaseId), "-R", inspection.repo);
                retried = true;
                if (kind === "sourceRun") { delete state.deploySha; delete state.pagesRun; }
              } else if (!retried) throw new Error(`部署工作流未成功，可在恢复发布时重试：${item.url}`);
              else {
                const current = JSON.parse(await gh(run, root, "api", `repos/${inspection.repo}/actions/runs/${item.databaseId}`));
                if (current.run_attempt > previousAttempt && current.status === "completed" && current.conclusion !== "success") throw new Error(`重试后的工作流仍未成功：${item.url}`);
              }
            }
          }
          await wait(5000);
        }
        throw new Error("部署状态尚未确认，可恢复查询；不会重新提交或推送。");
      };
      update("source_workflow", "等待博客构建工作流");
      await awaitRun("deploy.yml", state.sourceSha!, "sourceRun");
      if (!state.deploySha) {
        for (let page = 1; ; page++) {
          const commits = JSON.parse(await gh(run, root, "api", `repos/${inspection.repo}/commits?sha=gh-pages&per_page=100&page=${page}`)) as Array<{ sha: string; commit: { message: string } }>;
          state.deploySha = commits.find((item) => item.commit.message.trim() === `deploy: ${state.sourceSha}`)?.sha;
          if (state.deploySha || commits.length < 100) break;
        }
        if (!state.deploySha) throw new Error("未找到本次源提交对应的 gh-pages 部署提交，可恢复查询。");
      }
      await awaitRun("pages-build-deployment", state.deploySha, "pagesRun");
      const cname = workspaceFile(root, "public/CNAME", true);
      const domain = fs.existsSync(cname) ? fs.readFileSync(cname, "utf8").trim() : "";
      if (domain && !/^[a-z\d.-]+$/i.test(domain)) throw new Error("CNAME 域名无效。");
      const [owner, repo] = inspection.repo.split("/");
      state.url = domain ? `https://${domain}` : `https://${owner}.github.io${repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? "" : `/${repo}`}`;
      const verify = options.verify ?? (async (url: string, sha: string) => {
        const response = await fetch(`${url}/deployment.json?v=${sha}`, { signal: AbortSignal.timeout(15_000), headers: { "Cache-Control": "no-cache" } });
        return response.ok && (await response.json() as { sourceSha?: string }).sourceSha === sha;
      });
      update("verifying", "核对线上版本");
      for (let attempt = 0; attempt < 24; attempt++) { if (await verify(state.url, state.sourceSha!)) { update("complete", "已上线"); return state; } await wait(5000); }
      throw new Error("工作流已完成，但线上版本尚未确认，可恢复查询。");
    } catch (error) { update(requiresReview ? "review_required" : "unconfirmed", error instanceof Error ? error.message : String(error)); throw error; }
  });
}
