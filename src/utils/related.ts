import { site } from "../site.config";
import { postSlug, type Post } from "./posts";

/**
 * 相关文章：标签重合度优先，同分取较新的文章。
 * 不修改传入数组，不返回当前文章。
 */
export function relatedPosts(current: Post, pool: Post[], limit = site.maxRelated): Post[] {
  const tags = new Set(current.data.tags.map((tag) => tag.toLowerCase()));

  const scored = pool
    .filter((post) => post.id !== current.id)
    .map((post) => {
      let score = 0;
      for (const tag of post.data.tags) {
        if (tags.has(tag.toLowerCase())) score += 1;
      }
      // 同语言内容优先，避免中英文混排推荐
      if (post.data.lang === current.data.lang) score += 0.25;
      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime();
    });

  return scored.slice(0, limit).map((item) => item.post);
}

/** 同一主题的另一种语言版本：靠 i18nKey 关联，缺失则返回 null */
export function translationOf(current: Post, pool: Post[]): Post | null {
  const key = current.data.i18nKey;
  if (!key) return null;
  return (
    pool.find(
      (post) =>
        post.id !== current.id &&
        post.data.i18nKey === key &&
        post.data.lang !== current.data.lang,
    ) ?? null
  );
}

/** 供调试与内部链接使用 */
export function postPath(post: Post): string {
  return `/posts/${postSlug(post)}/`;
}
