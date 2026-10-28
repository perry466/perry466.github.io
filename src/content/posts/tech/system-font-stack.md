---
title: "系统字体栈就够了"
description: "不加载 Web 字体，首屏少一次请求，中文也不必等字体下载完成才可读。代价是观感取决于系统。"
pubDate: 2026-08-16
category: tech
tags: ["CSS", "排版"]
---

中文 Web 字体动辄几兆，切分、预加载、`font-display` 都要处理，最后的效果还不一定比系统字体好。

```css
:root {
  --font-sans: system-ui, -apple-system, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  --font-serif: "Songti SC", "Noto Serif SC", ui-serif, Georgia, serif;
}
```

代价是同一个页面在不同系统上长得不完全一样。我认为这个代价可以接受：读者对「自己的系统字体」熟悉，阅读反而更顺。
