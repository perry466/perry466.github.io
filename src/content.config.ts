import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { site } from "./site.config";

/**
 * 分类取值来自 site.config.ts 的 categories 表（封闭集合）。
 * 这里用 z.enum 而不是自由字符串：写错 slug 会在构建期直接报错，而不是多出一个空分类。
 */
const categorySlugs = site.categories.map((item) => item.slug) as [string, ...string[]];

/**
 * 文章集合。
 * - 以 `_` 开头的文件不进入集合（可作为草稿池）。
 * - `draft: true` 与 `pubDate` 晚于构建时间的文章在 utils/posts.ts 中统一过滤，
 *   页面模板不自行判断。
 * - `pubDate` / `updatedDate` 可省略，由 utils/posts.ts 结合 git 提交时间补齐。
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1).max(60),
      description: z.string().min(20).max(160),
      /**
       * 发布日期：可以不写。
       * 不写时取该文件的首次 git 提交时间（= 第一次推送的时间），见 utils/git-dates.ts。
       * 手写优先，用于补录旧文或定时发布。
       */
      pubDate: z.coerce.date().optional(),
      /**
       * 更新日期：一般不用写。
       * 不写时，如果该文件有超过一次提交，自动取最后一次提交时间。
       */
      updatedDate: z.coerce.date().optional(),
      /** 栏目：单选，取值见 site.config.ts 的 categories */
      category: z.enum(categorySlugs).default(site.categoryDefault),
      tags: z.array(z.string().min(1).max(24)).max(5).default([]),
      draft: z.boolean().default(false),
      pinned: z.boolean().default(false),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字与连字符")
        .optional(),
      lang: z.enum(["zh", "en"]).default("zh"),
      i18nKey: z.string().optional(),
    }),
});

/**
 * 碎碎念：一句话的短内容，不需要标题、分类、标签。
 * 正文就是内容本身；日期不写，由 git 首次提交时间补齐（见 pages/whispers.astro）。
 * 以 `_` 开头的文件同样不进入集合，可当草稿。
 */
const whispers = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/whispers" }),
  schema: z.object({}),
});

export const collections = { posts, whispers };
