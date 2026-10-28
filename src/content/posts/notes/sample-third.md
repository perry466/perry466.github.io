---
title: "示例文章：放在子目录里"
description: "用来验证文章可以放在子目录中、URL 与 slug 仍然正确生成，正文为占位文字。"
pubDate: 2026-10-14
category: tech
tags: ["示例", "工程"]
lang: "zh"
---

这篇文章的文件放在 `src/content/posts/notes/` 子目录里，用来确认子目录不会影响 URL 生成。

## 关于路径

- URL 默认由文件路径生成，`notes/sample-third.md` 对应 `/posts/notes/sample-third/`。
- 需要更短的地址时，在 Front Matter 里写 `slug`，展示地址会改用 slug。
- 一旦发布过，`slug` 不要再改；必须改的时候要同时配置 301 跳转。

## 结尾

示例内容到此结束。删除这三篇示例后，把 `src/site.config.ts` 里的名字与简介换成自己的，站点就可以开始写了。
