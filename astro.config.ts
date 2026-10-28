import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { site } from "./src/site.config";
import rehypeEnhance from "./src/plugins/rehype-enhance";
import remarkCodeMeta from "./src/plugins/remark-code-meta";

// 站点地址同时用于 canonical、RSS、sitemap，必须与部署地址一致。
export default defineConfig({
  site: site.url,
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [mdx(), sitemap()],
  markdown: {
    // Astro 7 起 remark/rehype 插件通过 unified() 传入，不再直接挂到 markdown 上
    processor: unified({
      remarkPlugins: [remarkCodeMeta],
      rehypePlugins: [rehypeEnhance],
    }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark-dimmed" },
      wrap: false,
    },
  },
});
