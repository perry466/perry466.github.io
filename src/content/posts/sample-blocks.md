---
title: "示例文章：正文元素总览"
description: "这是一篇占位示例，用来展示标题、列表、表格、引用、提示框、代码块与图片的排版效果，内容与真实信息无关。"
pubDate: 2026-10-28
category: notes
tags: ["示例", "排版"]
pinned: true
lang: "zh"
i18nKey: "sample-blocks"
cover: ../../assets/sample-cover.png
coverAlt: "示例封面：细线山形构图"
---

这是一篇用于验证排版的示例文章。正式使用前，请把 `src/content/posts/` 下的示例文件替换成你自己的文章。

## 段落与强调

正文默认宽度约 72 个字符，行高 1.75。段落之间留出的空白比行距更大，这样眼睛换行时更容易找到下一行的起点。可以加**粗体**、*着色强调*、`行内代码`，以及[站内链接](/posts/)。

行内元素混排时要注意：中英文之间留一个半角空格，`code` 与中文之间也留一个，读起来会顺很多。

## 列表

无序列表用于并列项：

- 第一条，用来测试换行后的悬挂缩进是否对齐
- 第二条
- 第三条

有序列表用于有先后关系的步骤：

1. 先在本地写 Markdown
2. 然后执行构建
3. 最后推送到主分支

## 表格

| 项目 | 取值 | 说明 |
| --- | --- | --- |
| 页宽 | 72ch | 正文最大宽度 |
| 正文字号 | 17px | 移动端 16px |
| 行高 | 1.75 | 段落间距更大 |
| 断点 | 640 / 1024 | 以内容是否拥挤为准 |

## 引用与提示框

> 引用用于摘录或强调一段话。中文不使用斜体，靠缩进与左边线区分层级。

> [!NOTE]
> 提示框在构建期由 `> [!NOTE]` 转换而来，支持 NOTE、TIP、IMPORTANT、WARNING、CAUTION 五种类型。

> [!WARNING]
> 提示框的颜色同时定义了明暗两套，切换主题时会一起变化，不需要单独维护。

## 代码块

行号与文件名都是可选的：

```ts title="src/utils/sample.ts" lineNumbers
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// 中文注释也要能正常显示
const message = greet("世界");
console.log(message);
```

不带标题的代码块只显示语言：

```bash
pnpm install
pnpm dev
```

## 图片

正文图片自动懒加载，点击可放大，支持左右切换：

![示例图片：细线山形构图](../../assets/sample-cover.png)

## 脚注

脚注适合放补充说明，不打断正文节奏。[^1]

[^1]: 这是一条脚注示例，点击编号可以跳回正文。
