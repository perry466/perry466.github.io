---
title: "读懂 SQLite 的查询计划"
description: "EXPLAIN QUERY PLAN 的输出不长，但它决定了加不加索引、加哪个索引。这里记四条判读经验，都是被慢查询教出来的。"
pubDate: 2026-10-09
category: notes
tags: ["SQLite"]
---

一条查询从 400ms 降到 3ms，靠的不是加索引，而是先看懂它在干什么。

```sql
EXPLAIN QUERY PLAN
SELECT id, title FROM posts WHERE lang = 'zh' ORDER BY pub_date DESC LIMIT 10;
```

输出里最要紧的是两个词：`SCAN` 和 `SEARCH`。前者是全表扫描，后者才用上了索引。

## 四条判读经验

| 输出片段 | 含义 | 该做什么 |
| --- | --- | --- |
| `SCAN posts` | 全表扫描 | 确认过滤列是否有索引 |
| `SEARCH posts USING INDEX idx_lang` | 走了索引 | 看是否还漏了排序 |
| `USE TEMP B-TREE FOR ORDER BY` | 排序发生在内存里 | 把排序列并入复合索引 |
| `USING COVERING INDEX` | 只读索引就够 | 好状态，别乱改 |

## 复合索引的顺序

`WHERE lang = ? ORDER BY pub_date DESC` 这条查询，索引要按 `(lang, pub_date)` 建，而不是反过来：

```sql
CREATE INDEX idx_posts_lang_date ON posts (lang, pub_date DESC);
```

等值条件在前、排序列在后，索引才能同时解决过滤和排序。顺序反了，SQLite 仍可以用索引过滤，但排序得另起一个临时 B 树。

> [!NOTE]
> 索引不是免费的。每个索引都会让写入变慢、让文件变大。二十条数据时随便建，两百万条时要算清楚。

## 一个反直觉的地方

`LIMIT 10` 并不能保证快。如果排序列没有索引，SQLite 仍要把所有匹配行排完才能取前十行。加了索引之后，它读十条就停。

所以「查询已经带 LIMIT 了，应该不快吧」这个直觉是错的。看计划，不要猜。
