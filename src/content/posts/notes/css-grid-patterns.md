---
title: "Grid 的几个实用模式"
description: "自动填充的卡片网格、宽度不等时的对齐、以及为什么有些布局用 grid 一行就够，用 flex 却要写一堆包裹层。"
pubDate: 2026-10-25
category: notes
tags: ["CSS"]
---

Flex 和 Grid 不是新旧关系，是两种思路：一个沿一条轴排，一个先在两个方向上划格子。

下面三个场景，用 Grid 都比 Flex 少写不少东西。

## 一、自动填充的卡片网格

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}
```

一行代码解决「尽可能多放，但每张不小于 240px」。用 Flex 实现同样的效果需要算宽度、处理最后一行的拉伸，还要写媒体查询。

`auto-fill` 和 `auto-fit` 的区别只在一处：容器比内容宽时，`auto-fit` 会把空轨道折叠，卡片被拉满；`auto-fill` 保留空轨道，卡片保持原宽。列表页通常要 `auto-fill`，因为它让卡片尺寸稳定。

## 二、日期列 + 内容列

```css
.row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 1rem;
}
```

关键是 `minmax(0, 1fr)`。如果写成 `1fr`，长标题或长单词会把这一列撑破，因为 `1fr` 的最小值是 `auto`（等于内容宽度）。这是 Grid 里最容易踩的一个坑，而且只在特定内容下才暴露。

## 三、让元素跨列而不改结构

```css
.layout > .full {
  grid-column: 1 / -1;
}
```

正文里偶尔需要一张通栏的图或表格。用 Grid 时不需要额外的包裹层，给那个元素一条规则就行。

## 什么时候还是该用 Flex

- 一行按钮、标签、图标 —— 单轴排列，flex 更直接
- 需要 `space-between` 把两端顶开 —— Grid 也能做，但没必要
- 子元素宽度由内容决定、不参与分配 —— flex 的 `flex: none` 更直观

> 判断标准可以简化成一句：**需要「对齐两个方向」就用 Grid，只需要「排一条线」就用 Flex。**
