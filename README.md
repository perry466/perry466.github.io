# 留白 (Whitespace)

个人静态博客。Astro 静态生成，内容写在 Markdown 里，push 到 `main` 即发布。

线上地址：<https://perry466.github.io>

## 环境要求

- Node.js ≥ 22.23.4（Astro 7 的下限，低于此版本 `astro dev` 会直接拒绝启动）
- pnpm ≥ 10

```bash
node -v   # 需要 v22.23.4 以上，推荐 v24
pnpm -v   # 需要 10.x
```

如果 `pnpm` 不存在：

```bash
npm i -g pnpm@10
```

## 本地命令

第一次运行：

```bash
cd D:\project\Whitespace
pnpm install
pnpm dev
```

之后每次只需要：

```bash
pnpm dev
```

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 本地写作，打开 http://localhost:4321 ，改文件自动刷新 |
| `pnpm check` | 类型与 Astro 校验，不产出文件 |
| `pnpm build` | 校验 + 静态构建 + 生成 Pagefind 搜索索引，产出 `dist/` |
| `pnpm preview` | 以生产模式预览 `dist/`，用来验证搜索、RSS、分享信息 |
| `pnpm index` | 只重建搜索索引（`dist` 已存在时用） |

`pnpm dev` 下没有搜索索引是正常的：索引由 `pagefind --site dist` 在构建后生成。要验证搜索必须先 `pnpm build` 再 `pnpm preview`。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `Node.js vX is not supported by Astro!` | node 版本低于 22.23.4。升级 node，或确认终端里 `node -v` 指向新版 |
| `pnpm: command not found` | 执行 `npm i -g pnpm@10`，然后**重开终端** |
| 端口 4321 被占用 | `pnpm dev --port 4322` |
| 改了 Markdown 插件但页面没变化 | Astro 把渲染结果缓存在 `node_modules/.astro`，删除该目录后重新构建 |
| 搜索没结果 | 先 `pnpm build`，再 `pnpm preview`；`dev` 模式没有索引 |

## 目录

```text
src/
├─ content/posts/       文章（Markdown / MDX）
├─ content.config.ts    文章 Front Matter 校验
├─ site.config.ts       站点名、导航、功能开关、第三方 ID
├─ i18n/ui.ts           中英文界面文案
├─ components/          组件
├─ layouts/             页面骨架
├─ pages/               路由
├─ styles/              tokens / global / prose 三层样式
├─ scripts/             浏览器端脚本（搜索、主题、灯箱、目录）
└─ utils/               过滤、排序、分页、相关文章、SEO
public/                 原样拷贝的静态资源
```

## 写一篇新文章

在 `src/content/posts/` 新建 `.md` 文件，Front Matter：

```yaml
---
title: "标题，不超过 60 字"
description: "摘要，20–160 字，用于列表页与 SEO，不自动截正文"
pubDate: 2026-10-28
updatedDate: 2026-10-30 # 可选，仅内容实质更新时填写
category: tech # 栏目，取值见 site.config.ts 的 categories，不写则归入「未分类」
tags: ["Astro", "搜索"] # 1–5 个
lang: "zh" # zh 或 en，默认 zh
draft: false # true 时完全不发布
pinned: false # 首页置顶
cover: ../../assets/cover.png # 可选，构建时自动优化
coverAlt: "封面替代文字" # 有 cover 时建议填写
i18nKey: "some-key" # 可选，同一主题的中英文两篇填相同值以互链
slug: custom-url # 可选，默认用文件路径
---
```

- `draft: true` 或 `pubDate` 晚于构建时间的文章不会出现在页面、RSS、sitemap 与搜索索引里。
- 缺少 `description`、标签超过 5 个、slug 格式错误、`category` 不在分类表里，都会让构建失败，并指出具体文件。
- 文件名以 `_` 开头不会进入集合，可作为草稿池。
- 正文图片放 `src/assets/`，用相对路径引用，构建时自动生成多尺寸。

## 分类与标签

- **分类**（`category`）是栏目，一篇文章只属于一个，取值是 `src/site.config.ts` 里 `categories` 的封闭集合；新增分类只需在表里加一项，`/categories/`、分类页与页头下拉会自动出现。
- **标签**（`tags`）是关键词，一篇文章 1–5 个，随手新建，聚合在 `/tags/`。
- 列表、归档、标签、搜索都会同时展示中英文文章，跨语言的文章带 `EN` / `中文` 标记。

## 支持的正文语法

除标准 Markdown 外：

- 代码块加文件名与行号：`` ```ts title="a.ts" lineNumbers ``
- 提示框：`> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]`
- 脚注：`[^1]` + `[^1]: 说明`
- 正文图片自动接入灯箱与懒加载

## 部署

推送到 `main` 触发 `.github/workflows/deploy.yml`：安装依赖 → `pnpm build` → 上传 `dist` → 部署到 GitHub Pages。

仓库需在 Settings → Pages → Source 选择 **GitHub Actions**。首次部署前请确认 `astro.config.ts` 里的 `site` 与 Pages 地址一致。

## 发布前检查

```bash
pnpm check && pnpm build && pnpm preview
```

抽查首页、一篇长文、一个标签页、搜索结果、`/rss.xml`；UI 改动额外检查明暗主题与 320 / 768 / 1440px 三档宽度。
