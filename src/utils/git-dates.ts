import { execFileSync } from "node:child_process";

export interface CommitDates {
  /** 首次提交时间：等于第一次推送的那一刻，之后改多少次都不变 */
  first: Date;
  /** 最后一次提交时间：每次推送修改后都会更新 */
  last: Date;
  /** 涉及该文件的提交次数；只有 ≥2 次才认为「修改过」 */
  count: number;
}

let cache: Map<string, CommitDates> | null = null;

/**
 * 一次性读完整段 git 历史，得到每篇文章的提交时间（按文章 id 索引，如 `tech/css-grid-patterns`）。
 *
 * 为什么是「一次调用」：逐文件执行 `git log -1 -- <file>` 在 26 篇时要 20 秒以上，
 * 而一次 `git log --name-status` 只要 0.4 秒，所以这里自己解析输出。
 *
 * 输出格式（`%x1e` 是记录分隔符，避免和正文冲突）：
 *
 *      \x1e2026-10-28T14:10:04+08:00
 *      A\tsrc/content/posts/tech/a.md
 *      \x1e2026-10-20T09:00:00+08:00
 *      M\tsrc/content/posts/tech/a.md
 *
 * git log 从新到旧，所以第一次遇到的提交是「最后一次修改」，
 * 之后每遇到一次都在往前推「首次提交」。
 *
 * 不是 git 仓库（例如直接下载的 zip）时返回空表，由调用方退回文件修改时间。
 */
export function getCommitDates(): Map<string, CommitDates> {
  if (cache) return cache;
  cache = new Map();

  let raw = "";
  try {
    raw = execFileSync(
      "git",
      [
        // 关掉路径转义：默认会把中文文件名输出成 \345\234\250 这种八进制，没法按 id 匹配
        "-c",
        "core.quotepath=false",
        "log",
        "--name-status",
        "--format=%x1e%cI",
        "--",
        "src/content/posts",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        // CI 与本地都可能没有 git，出错交给 catch，不要污染构建日志
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
  } catch {
    return cache;
  }

  let current: Date | null = null;

  for (const line of raw.split("\n")) {
    const text = line.trim();
    if (text === "") continue;

    if (text.startsWith("\x1e")) {
      const parsed = new Date(text.slice(1).trim());
      current = Number.isNaN(parsed.getTime()) ? null : parsed;
      continue;
    }

    if (!current) continue;

    const [status, ...paths] = text.split("\t");
    // 只认「新增」和「修改」；重命名（R）等类型跳过，避免把改名当成新文章
    if (!/^[AM]$/.test(status ?? "") || paths.length === 0) continue;

    const file = (paths[paths.length - 1] ?? "").replace(/^"|"$/g, "");
    const id = file
      .replace(/\\/g, "/")
      .replace(/^src\/content\/posts\//, "")
      .replace(/\.mdx?$/, "");

    if (id === "") continue;

    const existing = cache.get(id);
    if (existing) {
      existing.first = current;
      existing.count += 1;
    } else {
      cache.set(id, { first: current, last: current, count: 1 });
    }
  }

  return cache;
}
