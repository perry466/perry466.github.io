import { site, type CategoryItem } from "../site.config";
import type { Post } from "./posts";

/**
 * 分类 = 栏目：一篇文章只属于一个分类，取值范围是 site.config.ts 里的封闭集合。
 * 与标签（开放集合、多选、按关键词）是两套模型，不要在模板里混用。
 */

export type Category = CategoryItem;

export interface CategorySummary extends CategoryItem {
  /** 已发布文章数（导航与分类页都按它过滤空分类） */
  count: number;
}

function fallbackCategory(): Category {
  const found =
    site.categories.find((item) => item.slug === site.categoryDefault) ?? site.categories[0];
  if (!found) {
    throw new Error("site.config.ts 的 categories 不能为空，至少需要一个默认分类");
  }
  return found;
}

/** 文章所属分类；slug 已由 schema 校验，这里只做兜底 */
export function categoryOf(post: Post): Category {
  return site.categories.find((item) => item.slug === post.data.category) ?? fallbackCategory();
}

/** 分类页地址 */
export function categoryPath(slug: string): string {
  return `/categories/${slug}/`;
}

/**
 * 按 site.config 的声明顺序汇总分类与文章数。
 * 默认过滤掉没有文章的分类，避免导航里出现点进去是空页的入口。
 */
export function collectCategories(
  posts: Post[],
  options: { includeEmpty?: boolean } = {},
): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const item of site.categories) {
    map.set(item.slug, { ...item, count: 0 });
  }

  for (const post of posts) {
    const entry = map.get(categoryOf(post).slug);
    if (!entry) continue;
    entry.count += 1;
  }

  const list = [...map.values()];
  return options.includeEmpty ? list : list.filter((item) => item.count > 0);
}

/** 某个分类下的文章（保持传入顺序，即发布时间倒序） */
export function postsInCategory(posts: Post[], slug: string): Post[] {
  return posts.filter((post) => categoryOf(post).slug === slug);
}
