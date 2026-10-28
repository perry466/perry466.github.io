import { statSync } from "node:fs";
import { getCollection, type CollectionEntry } from "astro:content";
import { site, type Locale } from "../site.config";
import { formatYear } from "./format";
import { getCommitDates } from "./git-dates";

export type RawPost = CollectionEntry<"posts">;
type RawData = RawPost["data"];

/**
 * 补齐日期后的文章数据：`pubDate` 一定存在，`updatedDate` 只在真的改过时存在。
 * 模板拿到的都是补齐后的类型，不需要自己判断日期从哪来。
 */
export interface PostData extends Omit<RawData, "pubDate" | "updatedDate"> {
  pubDate: Date;
  updatedDate?: Date;
}

export type Post = Omit<RawPost, "data"> & { data: PostData };

/** 文章公开地址使用的 slug：优先 front matter 的 slug，否则用文件路径 id */
export function postSlug(post: Post): string {
  if (post.data.slug) return post.data.slug;
  return post.id.replace(/\.mdx?$/, "").replace(/\/index$/, "");
}

/** 草稿与未来日期文章的统一过滤规则，模板不重复判断 */
export function isPublished(post: Post, now: Date = new Date()): boolean {
  return post.data.draft !== true && post.data.pubDate.getTime() <= now.getTime();
}

/** 文件修改时间：git 里找不到记录时（新写完还没提交）用它兜底 */
function fileMtime(entry: RawPost): Date | undefined {
  if (!entry.filePath) return undefined;
  try {
    return statSync(entry.filePath).mtime;
  } catch {
    return undefined;
  }
}

/**
 * 把 front matter、git 提交时间、文件时间合成为最终日期。
 *
 * 优先级：
 * - 发布日期：手写 > 首次提交时间 > 文件修改时间 > 构建时间
 * - 更新日期：手写 > 最后一次提交时间（仅当提交次数 ≥ 2）
 *
 * 「提交次数 ≥ 2」这个条件是必要的：文章第一次推送时首次与最后提交是同一次，
 * 不加判断会让每篇新文章一上线就显示「更新于同一天」。
 */
function resolveDates(entry: RawPost): Post {
  const raw = entry.data;
  const commits = getCommitDates().get(entry.id);
  const pubDate = raw.pubDate ?? commits?.first ?? fileMtime(entry) ?? new Date();
  const updatedDate =
    raw.updatedDate ?? (commits && commits.count > 1 ? commits.last : undefined);

  return { ...entry, data: { ...raw, pubDate, updatedDate } };
}

function byDateDesc(a: Post, b: Post): number {
  const diff = b.data.pubDate.getTime() - a.data.pubDate.getTime();
  if (diff !== 0) return diff;
  return postSlug(a).localeCompare(postSlug(b));
}

let cache: Post[] | null = null;

/**
 * 全部已发布文章，按发布时间倒序。
 * 结果缓存，避免各页面重复扫描与重复排序。
 */
export async function getAllPosts(): Promise<Post[]> {
  if (cache) return cache;
  const now = Date.now();
  const entries = await getCollection("posts");
  cache = entries
    .map(resolveDates)
    .filter((post) => post.data.draft !== true && post.data.pubDate.getTime() <= now)
    .sort(byDateDesc);
  return cache;
}

/** 按语言取文章（语言过滤在构建期完成，用于生成语言相关的聚合页面） */
export function filterByLang(posts: Post[], lang: Locale): Post[] {
  return posts.filter((post) => post.data.lang === lang);
}

/** 置顶文章：置顶优先，其次按时间倒序，最多 maxPinned 篇 */
export function getPinned(posts: Post[], limit = site.maxPinned): Post[] {
  return posts
    .filter((post) => post.data.pinned)
    .sort(byDateDesc)
    .slice(0, limit);
}

/** 去掉置顶后的普通文章 */
export function withoutPinned(posts: Post[], pinned: Post[]): Post[] {
  const pinnedIds = new Set(pinned.map((post) => post.id));
  return posts.filter((post) => !pinnedIds.has(post.id));
}

/**
 * 上一篇 / 下一篇。
 * 语义按发布时间定义：previous 是本篇之前发布的（更旧），next 是之后发布的（更新），
 * 与阅读顺序一致，避免按数组下标产生歧义。
 */
export function getAdjacent(
  posts: Post[],
  current: Post,
): { previous: Post | null; next: Post | null } {
  const index = posts.findIndex((post) => post.id === current.id);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: posts[index + 1] ?? null,
    next: index > 0 ? (posts[index - 1] ?? null) : null,
  };
}

/** 分页：页码从 1 开始 */
export function paginate<T>(items: T[], pageSize: number, page: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 去掉 Markdown 语法，用于估算字数与生成摘要 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 字数：中日韩字符按字计，拉丁文本按词计 */
export function countWords(markdown: string): number {
  const text = stripMarkdown(markdown);
  const cjk = text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g)?.length ?? 0;
  return cjk + latin;
}

/** 阅读时长（分钟）：中文 380 字/分，拉丁 200 词/分，取整且至少 1 分钟 */
export function readingMinutes(markdown: string): number {
  const text = stripMarkdown(markdown);
  const cjk = text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g)?.length ?? 0;
  return Math.max(1, Math.round(cjk / 380 + latin / 200));
}

export interface YearGroup {
  year: string;
  posts: Post[];
}

/** 归档分组：按年倒序 */
export function groupByYear(posts: Post[]): YearGroup[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const year = formatYear(post.data.pubDate);
    const list = map.get(year);
    if (list) list.push(post);
    else map.set(year, [post]);
  }
  return [...map.entries()]
    .map(([year, list]) => ({ year, posts: list.sort(byDateDesc) }))
    .sort((a, b) => Number(b.year) - Number(a.year));
}

export interface TagSummary {
  /** 展示名 */
  name: string;
  /** URL 片段（小写、短横线） */
  slug: string;
  count: number;
}

/** 标签 slug：统一小写与连字符，展示名与 URL 分离 */
export function tagSlug(tag: string): string {
  const normalized = tag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || encodeURIComponent(tag.trim());
}

/** 全部标签及文章数，按数量倒序、同名按字典序 */
export function collectTags(posts: Post[]): TagSummary[] {
  const map = new Map<string, TagSummary>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const existing = map.get(slug);
      if (existing) existing.count += 1;
      else map.set(slug, { name: tag, slug, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** 文章标签的展示名（保留 front matter 原始写法） */
export function postTags(post: Post): TagSummary[] {
  return post.data.tags.map((tag) => ({ name: tag, slug: tagSlug(tag), count: 0 }));
}
