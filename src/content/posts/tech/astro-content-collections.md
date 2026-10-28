---
title: "用内容集合管住二十篇文章"
description: "从 glob 加载器到 zod schema，把文章元数据当成类型来约束，让缺字段的稿件在构建期就暴露，而不是上线以后才发现。"
pubDate: 2026-10-26
category: tech
tags: ["Astro", "内容管理"]
pinned: true
i18nKey: "astro-content-collections"
cover: ../../../assets/sample-cover.png
coverAlt: "示例封面：细线山形构图"
---

文章少的时候，front matter 随便写；文章过二十篇，拼错一个字段名、漏一个日期，问题就开始在构建产物里露头：列表页少一条、RSS 里出现 `Invalid Date`、某个聚合页面直接空白。

内容集合解决的不是「写文章」，而是「文章的结构」。

## 加载器决定范围

先用 glob 加载器把目录里符合条件的文件读进集合：

```ts
const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) => z.object({ /* ... */ }),
});
```

`[^_]` 那段不是装饰：以 `_` 开头的文件不会进入集合，可以当草稿池用——写废的半篇放在那里，不会被任何页面读到。

## schema 是构建期的合同

字段一旦写进 schema，就不再是「约定」，而是「约束」：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 1–60 字符 | 列表页与 SEO 标题 |
| `description` | string | 20–160 字符 | 列表摘要与 meta description |
| `pubDate` | date | 必填 | 支持 `2026-10-26` 这种简写 |
| `category` | enum | 见分类表 | 单选，写错直接报错 |
| `tags` | string[] | 最多 5 个 | 开放集合 |
| `draft` | boolean | 默认 false | true 时完全不发布 |

`description` 的下限定在 20 字符是有原因的：太短的摘要既撑不起列表里的两行，也过不了搜索引擎的展示测试。

> 宁可构建失败，也不要带着缺字段的文章上线。构建失败的成本是几秒，缺字段的成本是读者看到一行空白。

## 过滤只做一次

草稿、未来日期、分类兜底这三件事，只在取数的函数里判断一次，模板不再重复写 `if`：

```ts
const entries = await getCollection("posts", (entry) => {
  const data = entry.data as Post["data"];
  return data.draft !== true && data.pubDate.getTime() <= Date.now();
});
```

好处是「一处判断，处处一致」。坏处也真实存在：列表、归档、RSS、搜索索引全都会跟着这个函数走，改它等于改全站。所以这个函数应该是整个项目里最保守的地方。

> [!NOTE]
> 渲染结果会被缓存。改完 schema 或 Markdown 插件后如果页面毫无变化，先删掉 `node_modules/.astro` 再构建。

## 二十篇之后

到这个量级，真正省事的不是模板，而是「不可能会出现脏数据」这件事本身。加一篇新文章时，只要照着 schema 填，分类写错会立刻报错，标签超量会被拦下，日期格式不对也过不去。
