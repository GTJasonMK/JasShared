import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<string>;
export const runCommand: CommandRunner = (command, args, cwd) => new Promise((resolve, reject) => {
  const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const executable = process.platform === "win32" && command === "npm" ? process.execPath : command;
  const parameters = process.platform === "win32" && command === "npm" ? [npmCli, ...args] : args;
  if (process.platform === "win32" && command === "npm" && !fs.existsSync(npmCli)) { reject(new Error("未找到 Node 安装目录中的 npm，请修复 Node 安装。")); return; }
  execFile(executable, parameters, { cwd, timeout: command === "npm" ? 900_000 : 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GH_PROMPT_DISABLED: "1" } }, (error, stdout, stderr) => {
    if (error) reject(new Error(`${command} 执行失败：${String(stderr || error.message).replace(/gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+/g, "[已隐藏]").slice(-4000)}`));
    else resolve(command === "git" && args[0] === "status" ? stdout : stdout.trim());
  });
});
