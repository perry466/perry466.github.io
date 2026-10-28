import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * 文章集合。
 * - 以 `_` 开头的文件不进入集合（可作为草稿池）。
 * - `draft: true` 与 `pubDate` 晚于构建时间的文章在 utils/posts.ts 中统一过滤，
 *   页面模板不自行判断。
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1).max(60),
      description: z.string().min(20).max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
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

export const collections = { posts };
