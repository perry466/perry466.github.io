---
title: "Keeping twenty posts in line with content collections"
description: "A glob loader plus a zod schema turns front matter into a build-time contract: a missing field fails the build instead of the page."
pubDate: 2026-10-26
category: tech
tags: ["Astro", "内容管理"]
lang: "en"
i18nKey: "astro-content-collections"
---

With five posts, front matter is just text. With twenty, a typo in a field name starts showing up in the output: one missing row in the list, an `Invalid Date` in the feed, an aggregation page that renders empty.

Content collections are not about writing posts. They are about the shape of a post.

## The loader decides the scope

A glob loader reads every file that matches the pattern into the collection:

```ts
const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) => z.object({ /* ... */ }),
});
```

The `[^_]` is not decoration. Files starting with an underscore never enter the collection, so the directory doubles as a scratch pad for half-written drafts.

## The schema is a contract

Once a field is in the schema it stops being a convention and becomes a constraint:

| Field | Type | Rule | Used for |
| --- | --- | --- | --- |
| `title` | string | 1–60 chars | List and SEO title |
| `description` | string | 20–160 chars | List excerpt and meta description |
| `pubDate` | date | required | `2026-10-26` is accepted |
| `category` | enum | see the category table | Single value, typos fail the build |
| `tags` | string[] | up to 5 | Open set |
| `draft` | boolean | defaults to false | Never published when true |

The lower bound on `description` is deliberate: anything shorter neither fills two lines in a list nor survives a search result preview.

> Fail the build, not the page. A failed build costs seconds; a broken page costs a reader's trust.

## Filter once, everywhere

Drafts, future dates and the category fallback are all decided inside the data function, so templates never repeat the logic:

```ts
const entries = await getCollection("posts", (entry) => {
  const data = entry.data as Post["data"];
  return data.draft !== true && data.pubDate.getTime() <= Date.now();
});
```

One place to judge means one place to fix. It also means this function is the most load-bearing code in the project, since the list, archive, feed and search index all route through it.

> [!NOTE]
> Rendering results are cached. If a schema change produces no visible difference, delete `node_modules/.astro` and build again.
