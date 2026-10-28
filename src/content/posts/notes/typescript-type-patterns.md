---
title: "几个够用的 TypeScript 类型模式"
description: "联合类型加穷尽检查、用 satisfies 保住字面量、模板字符串类型约束键名——三个在日常代码里反复出现的写法。"
pubDate: 2026-10-02
category: notes
tags: ["TypeScript"]
---

类型体操的花活大多不值得学，但有三个写法我几乎每个项目都会用到。

## 一、联合类型 + 穷尽检查

枚举状态用字符串字面量联合，比 `enum` 轻，也更好序列化：

```ts
type State = "idle" | "loading" | "done" | "error";

function label(state: State): string {
  switch (state) {
    case "idle":
      return "待开始";
    case "loading":
      return "加载中";
    case "done":
      return "已完成";
    case "error":
      return "失败";
    default: {
      const never: never = state;
      return never;
    }
  }
}
```

新增一个状态却忘了处理时，`const never: never = state` 会直接编译失败。这比运行时才发现少一个分支好得多。

## 二、`satisfies` 保住字面量

标注类型会把字面量 widened 成 `string`，而 `satisfies` 既校验形状又保留具体类型：

```ts
const nav = [
  { label: "文章", href: "/posts/" },
  { label: "归档", href: "/archive/" },
] satisfies NavItem[];

// nav[0].href 依然是 "/posts/"，不是一个宽泛的 string
```

这招在配置表上特别有用：既能拿到结构校验，又能在别处把字面量当类型用。

## 三、模板字符串类型约束键名

```ts
type Field = `post.${"title" | "date" | "tags"}`;
// "post.title" | "post.date" | "post.tags"
```

配合字典对象，可以做到「键名写错编译期报错、取值自动补全」：

```ts
const labels: Record<Field, string> = {
  "post.title": "标题",
  "post.date": "日期",
  "post.tags": "标签",
};
```

> [!TIP]
> 类型系统解决的问题是「让错误发生在写代码的时候」。凡是运行时才暴露的同类错误，通常都能往前挪一层。
