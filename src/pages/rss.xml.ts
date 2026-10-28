import rss from "@astrojs/rss";
import { render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { APIContext } from "astro";
import { site } from "../site.config";
import { categoryOf } from "../utils/categories";
import { getAllPosts } from "../utils/posts";
import { postPath } from "../utils/related";

/** 只输出最近 20 篇，避免全文 RSS 随文章数量线性膨胀 */
const MAX_ITEMS = 20;

/**
 * 全文 RSS。
 * render() 只提供组件而不提供 HTML，这里用容器 API 把组件渲染成字符串，
 * 好处是图片会走构建期优化，输出的是可直接访问的绝对地址。
 */
export async function GET(context: APIContext) {
  const posts = (await getAllPosts()).slice(0, MAX_ITEMS);
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      let html = "";
      try {
        html = await container.renderToString(Content);
      } catch {
        html = ""; // 渲染失败时退回摘要，不影响订阅可用性
      }
      const category = categoryOf(post);
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: postPath(post),
        author: site.author,
        // 分类（栏目）排在标签前面，RSS 阅读器里能直接看出文章属于哪个栏目
        categories: [post.data.lang === "en" ? category.labelEn : category.label, ...post.data.tags],
        ...(html ? { content: html } : {}),
      };
    }),
  );

  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items,
    customData: `<language>${site.defaultLocale === "zh" ? "zh-cn" : "en"}</language>`,
    trailingSlash: true,
  });
}
