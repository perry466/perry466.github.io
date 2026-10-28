import rss from "@astrojs/rss";
import { render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { APIContext } from "astro";
import { site } from "../site.config";
import { categoryOf } from "../utils/categories";
import { getAllPosts } from "../utils/posts";
import { postPath } from "../utils/related";
import { absoluteUrl } from "../utils/seo";

/**
 * 站内相对地址转绝对地址。
 *
 * 阅读器里没有「站点根」的概念：正文里的 `/posts/x/` 会被解析成阅读器自己的域名，
 * 点开就是 404；`/_astro/x.webp` 这类图片同样会裂。所以拼进 feed 之前统一补上域名。
 * 只处理单个 `/` 开头的值，跳过 `//cdn.example.com` 这种协议相对地址。
 */
function absolutize(html: string): string {
  return html.replace(/(href|src)="(\/(?!\/)[^"]*)"/g, (_match, attr: string, path: string) => {
    return `${attr}="${absoluteUrl(path)}"`;
  });
}

/**
 * RSS 2.0 全文订阅。
 *
 * - 输出全部已发布文章（`site.rss.maxItems` 为 0 时），方便订阅者回看历史
 * - 正文用容器 API 渲染成 HTML，图片走构建期优化，输出可直接访问的绝对地址
 * - 站内链接与图片地址在写入前绝对化，保证在阅读器里点得开
 */
export async function GET(context: APIContext) {
  const all = await getAllPosts();
  const posts = site.rss.maxItems > 0 ? all.slice(0, site.rss.maxItems) : all;
  const container = await AstroContainer.create();

  // 内容最后一次变化的时间：文章有 updatedDate 就用它，否则用发布时间
  const lastModified = posts.reduce((latest, post) => {
    const time = (post.data.updatedDate ?? post.data.pubDate).getTime();
    return time > latest ? time : latest;
  }, 0);

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
        ...(site.rss.fullText && html ? { content: absolutize(html) } : {}),
      };
    }),
  );

  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items,
    trailingSlash: true,
    // atom:link rel="self" 需要先声明命名空间，否则订阅器会把 feed 当成无效 XML
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: [
      `<language>${site.defaultLocale === "zh" ? "zh-cn" : "en"}</language>`,
      `<lastBuildDate>${new Date(lastModified || Date.now()).toUTCString()}</lastBuildDate>`,
      `<atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml"/>`,
    ].join(""),
  });
}
