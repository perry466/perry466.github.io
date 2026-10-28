# 静态博客本地发布工具 · 方案

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v0.1（方案，未开发） |
| 日期 | 2026-10-28 |
| 代号 | Post Studio（暂定，可改） |
| 状态 | 待博客站点的「分类」功能落地后再进入开发 |
| 定位 | 本地桌面工具，通过本机 git 把 Markdown 发布到静态博客仓库 |

---

## 1. 目标与非目标

### 1.1 要解决的问题

写一篇博客的实际动作是：新建 md → 手写 front matter（标题、日期、分类、标签、摘要）→ 放对目录 → git add / commit / push。其中只有「写正文」是有价值的，其余都是容易出错的重复劳动。

工具负责除正文以外的全部环节，并且**不出错**。

### 1.2 目标

| 目标 | 说明 |
| --- | --- |
| 本地优先 | 全程在本机完成，不依赖任何在线服务，不保存任何 token |
| Git 直推 | 直接调用本机 `git`，复用已有凭据 |
| 多框架 | 支持 Astro / Hugo / Hexo / Jekyll / Eleventy 及自定义静态站 |
| 非破坏性 | 不认识的 front matter 字段、键序、注释、正文，一律原样保留 |
| 可视化 | 分类、标签、封面、摘要用表单点选，不用手写 YAML |
| 失败可见 | git 与构建的报错原样呈现，不美化、不吞掉 |

### 1.3 非目标

- 在线 CMS、多用户协作、云同步
- 替代 VS Code 写长文（工具面向「组装与发布」，不是代码编辑器）
- 图片托管、评论系统、SEO 分析
- 自动解决 git 冲突
- 支持非 Git 仓库

---

## 2. 设计原则

这五条决定了后续所有取舍，实现时不得绕过。

**① 站点是唯一真相。** 工具不定义内容模型，只读取站点的约定（目录、front matter 字段、分类规则）。站点改了，工具跟着改，不在工具里复制一份模型。

**② 非破坏性优先。** 任何一次保存，理想结果是「只有用户改动的字节发生变化」。做不到时，退化为「保留全部已知与未知字段，允许键序变化」，并在 UI 上明确说明本次是降级保存。

**③ 适配器给默认值，档案给最终值。** 自动探测只负责猜一套合理的默认配置，用户可以在档案里改任何一项。不要做「猜对了才能用」的工具。

**④ 不碰网络。** 不做 GitHub API 调用，不存 Personal Access Token。代价是不支持手机端，收益是没有密钥泄露面。

**⑤ 破坏性操作必须可撤销。** 删除、改 slug、改分类导致 URL 变化，一律二次确认并提示影响；所有改动在 git 里天然可回退，工具不额外做备份体系。

---

## 3. 数据模型

```
Workspace  工作区：一个 git 仓库 + 一份 Profile
  └── Profile  站点档案：目录约定、字段映射、分类规则、构建命令
        └── Document  文档：文件路径 + front matter（原始文本）+ 正文 + 指纹
              └── Taxonomy  分类体系：categories（栏目）、tags（标签）
```

### 3.1 Profile（核心）

Profile 是工具与站点之间的唯一契约。它是一份 JSON，可自动生成、可手改、可随仓库提交，也可放在用户目录。

```jsonc
{
  "version": 1,
  "name": "我的博客",
  "engine": "hugo",              // astro | hugo | hexo | jekyll | eleventy | custom

  "content": {
    "dir": "content/posts",       // 相对仓库根
    "glob": "**/*.md",            // 扫描规则
    "exclude": ["**/_draft/**"],  // 不参与管理的路径
    "frontMatter": "auto",        // auto | yaml | toml | json
    "dateFormat": "yyyy-MM-dd",   // 写入日期时的格式
    "filenamePattern": "{slug}.md" // 或 "{date}-{slug}.md"（Jekyll 风格）
  },

  "assets": {
    "dir": "static/images",
    "naming": "{slug}-{index}.{ext}",
    "reference": "/images/{filename}" // 回填到正文的引用形式
  },

  "fields": {
    "title": "title",
    "description": "description",
    "date": "date",
    "updated": "lastmod",
    "draft": "draft",
    "slug": "slug",
    "cover": "cover",
    "lang": "lang"
  },

  "taxonomy": {
    "categories": {
      "field": "categories",
      "mode": "single",           // single | multi
      "required": true,
      "source": ["日记", "鸡汤", "技术"],  // 可选：固定栏目
      "separator": null           // Hexo 层级分类用 ">"
    },
    "tags": {
      "field": "tags",
      "mode": "multi",
      "required": false,
      "max": 5
    }
  },

  "url": {
    "template": "/{categories}/{slug}/",  // 只用于「变更前/后 URL」比对
    "trailingSlash": true
  },

  "build": {
    "devCommand": "hugo server -D",
    "buildCommand": "hugo --minify",
    "checkBeforePush": false      // true 时推送前跑一次构建
  }
}
```

字段说明：

- `fields` 是通用性的关键。同一个语义在不同框架里键名不同（Hugo 的更新日期是 `lastmod`，Hexo 是 `updated`），工具内部用固定语义，写盘时按映射转换。
- `taxonomy.categories.source` 有值时，分类是**封闭集合**（下拉选择）；为空时是**开放集合**（从现有文章聚合 + 允许新增）。
- `url.template` 只用于提示「这次改动会让 URL 从 A 变成 B」，不参与实际生成——URL 由站点自己决定。

### 3.2 Document

```ts
interface Document {
  id: string;            // 相对仓库根的路径，如 "content/posts/hello.md"
  format: "yaml" | "toml" | "json";
  rawFrontMatter: string; // 原始文本，保真用
  data: Record<string, unknown>; // 解析后的对象（含未知字段）
  body: string;          // 正文，不含 front matter
  hash: string;          // 内容指纹，用于检测外部改动
  mtime: number;
}
```

**未知字段必须留在 `data` 里。** 例如站点自定义了 `series`、`weight`、`aliases`，工具不认识，但保存时必须原样写回。

---

## 4. 框架适配

### 4.1 探测逻辑

按顺序判断，命中即停，结果作为 Profile 默认值：

| 顺序 | 判断依据 | engine |
| --- | --- | --- |
| 1 | 有 `astro.config.{js,mjs,ts}` | astro |
| 2 | 有 `hugo.toml` / `config.toml` 且含 `[taxonomies]` | hugo |
| 3 | 有 `_config.yml` 且含 `hexo` 关键字 / 有 `source/_posts` | hexo |
| 4 | 有 `_config.yml` 且含 `jekyll` / 有 `_posts` | jekyll |
| 5 | 有 `.eleventy.js` / `eleventy.config.js` | eleventy |
| 6 | 以上都不匹配 | custom（进引导流程，让用户手动指目录） |

探测失败不是错误，只是一个需要用户补两步的状态。UI 上要写清楚「没认出来，请告诉我文章放在哪」。

### 4.2 各框架差异

| 项 | Astro | Hugo | Hexo | Jekyll |
| --- | --- | --- | --- | --- |
| 内容目录 | `src/content/posts` | `content/posts` | `source/_posts` | `_posts` |
| Front matter | YAML（`---`） | TOML / YAML / JSON 均可 | YAML | YAML |
| 分类字段 | 自定义，本项目用 `categories` | `categories` | `categories`（可嵌套） | `categories`（可省略，从路径推断） |
| 标签字段 | `tags` | `tags` | `tags` | `tags` |
| 草稿标记 | `draft: true` | `draft: true` | `published: false` | `published: false` |
| 文件名即 URL | 是 | 是（`slug` 可覆盖） | 是 | 是（`YYYY-MM-DD-title.md`） |
| 图片目录 | `src/assets`（构建优化） | `static/` | `source/images/` | `assets/` |

> [!IMPORTANT]
> 草稿的语义不统一：Hugo / Astro 用 `draft: true` 表示「不要发布」，Hexo / Jekyll 用 `published: false`。Profile 的 `fields.draft` 只能映射键名，**取值的语义需要额外一个 `draftValue`**（默认 `true` 对 Astro/Hugo，`false` 对 Hexo/Jekyll）。这是最容易写错的一处。

### 4.3 自定义站点

不预设结构，走引导流程：选仓库 → 选目录 → 选 front matter 格式 → 把识别到的字段和用户填的语义对应起来 → 存成 Profile。**只要能读 md、能跑 git，就能接入。**

---

## 5. 功能范围

### 5.1 P0：能用

| 模块 | 内容 |
| --- | --- |
| 工作区 | 选择仓库目录、自动探测、生成 Profile、记住上次打开的仓库 |
| 列表 | 扫描文章、解析 front matter、按日期排序、搜索标题、草稿/发布筛选 |
| 编辑 | 新建文章、编辑正文（Markdown 高亮）、实时预览 |
| 表单 | 标题 / 摘要 / 日期 / 分类（单选或多选）/ 标签 / 封面 / 草稿 / 置顶 |
| 校验 | 必填、长度、标签数量、slug 冲突、日期格式 |
| 发布 | 只 add 涉及的文件 → commit（信息可编辑）→ pull --rebase → push |
| 反馈 | git 输出原样显示；失败保留本地 commit，可重试 |

### 5.2 P1：顺手

- 导入本地 md（带 front matter 直接接管，不带则补表单）
- 图片拖入：压缩、改名、落到 assets、回填引用
- 标签与分类从历史文章聚合，输入时联想
- URL 变更检测：改 slug / 改分类时提示「旧链接会失效」
- 推送后轮询构建状态（仅当配置了 `buildCommand` 与仓库地址）
- 批量操作：批量改分类、批量加标签

### 5.3 P2：不着急

- 草稿箱（独立目录或 `_` 前缀）
- 删除、重命名（带 URL 影响提示）
- 简单的 front matter 高级编辑（直接改 YAML）
- 多仓库切换
- 打包为独立 exe

---

## 6. 技术架构

### 6.1 形态

本地 Node 服务 + 浏览器界面。一个人用，不需要 Electron 的壳。

```
┌─────────────────────────────┐
│ 浏览器窗口（Edge --app 模式）│  无地址栏，看起来像桌面软件
│  Vue 3 + Vite               │
└──────────────┬──────────────┘
               │ HTTP (127.0.0.1 + 随机端口 + 启动令牌)
┌──────────────▼──────────────┐
│ 本地 Node 服务              │
│  ├ core/profile   探测/档案 │
│  ├ core/workspace 扫描/读写 │
│  ├ core/frontmatter 保真    │
│  ├ core/taxonomy  分类标签  │
│  ├ core/media     图片处理  │
│  ├ core/git       git 调用  │
│  └ core/build     预览/构建 │
└─────────────────────────────┘
```

为什么不用 Electron：不需要跨平台分发、不需要系统托盘、不需要原生菜单；用 Node 服务还能直接复用 `git`、`sharp`、`jiti` 这些 Node 生态。将来真要 exe，用 Node 的 SEA 或 Tauri 包装前端即可，核心逻辑不用重写。

**安全约束**：服务只监听 `127.0.0.1`，端口随机，启动时生成一次性令牌，前端请求带 `Authorization`。避免本机其他程序或浏览器页面直接调用文件写入接口。

### 6.2 目录结构

```text
post-studio/
├─ core/
│  ├─ profile/       探测、默认值、校验
│  ├─ workspace/     扫描、读写、指纹
│  ├─ frontmatter/   解析、最小编辑、序列化
│  ├─ taxonomy/      分类标签聚合与建议
│  ├─ media/         压缩、命名、路径回填
│  ├─ git/           status / add / commit / pull / push
│  └─ build/         dev server 与构建
├─ server/           HTTP 接口
├─ web/              Vue 3 界面
├─ profiles/         内置档案模板（hugo / hexo / jekyll / astro）
└─ start.bat         双击启动
```

### 6.3 接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/workspace` | 当前工作区与 Profile |
| POST | `/api/workspace` | 选择/切换仓库，触发探测 |
| GET | `/api/posts` | 文章列表（含草稿标记、分类标签） |
| GET | `/api/posts/:id` | 单篇：front matter + 正文 + 指纹 |
| POST | `/api/posts` | 新建 |
| PUT | `/api/posts/:id` | 保存（带 `baseHash` 做并发检测） |
| POST | `/api/posts/import` | 导入本地 md |
| GET | `/api/taxonomy` | 分类与标签集合 + 计数 |
| POST | `/api/media` | 上传图片，返回落盘路径与引用文本 |
| GET | `/api/git/status` | 变更预览（哪些文件会被提交） |
| POST | `/api/git/commit` | 提交（可带自定义信息） |
| POST | `/api/git/push` | 推送（含 pull --rebase） |
| GET | `/api/validation` | 当前文章的校验结果 |

---

## 7. 关键实现约定

### 7.1 Front matter 保真（最重要）

三级策略，从高到低：

| 级别 | 策略 | 效果 |
| --- | --- | --- |
| A | **原文最小编辑**：只替换被修改键的值所在行，其余字节不动 | 注释、键序、缩进、引号风格全部保留 |
| B | 结构化重写：用 YAML Document API 保留注释与键序 | 注释保留，缩进可能变 |
| C | 全量序列化：解析 → 改 → 重新生成 | 只保证字段不丢，格式会被重排 |

默认走 A，失败降级到 B，B 失败才允许 C，且 C 发生时必须在界面提示「本次保存格式被重排」。

TOML 的注释在多数解析库里会丢失，所以 Hugo 的 TOML front matter **必须走 A**，不能走 C。

### 7.2 并发与覆盖

- 打开文章时记录 `hash`（内容 + mtime）。
- 保存前重新计算，不一致则拒绝写入，提示「文件已被其他程序修改」，提供「重新加载」与「强制覆盖」两个选项，默认前者。
- 每次写盘前把原文暂存到内存，供本次会话撤销（不做文件级备份系统）。

### 7.3 Slug 与文件名

- 默认从标题生成：中文转拼音（可选开关），转小写，非字母数字转连字符。
- 生成后检测同目录冲突，冲突时追加 `-2`。
- 修改已发布文章的 slug 属于破坏性操作：提示旧 URL 与新 URL，建议同时配置 301。
- Jekyll 的文件名含日期，改名时要按 `{date}-{slug}.md` 重排。

### 7.4 Git 流程

```
1. git status --porcelain           展示将要提交的文件
2. git add -- <仅限本次涉及的文件>
3. git commit -m "<模板>"           模板：post: <标题>
4. git pull --rebase --autostash    失败则中止，保留 commit
5. git push                         失败则保留 commit，提示重试
```

硬性规则：

- **禁止 `git add -A`**：用户可能在 IDE 里同时改了代码，不能被带上去。
- **禁止 `push --force`**。
- pull 出现冲突立即停止，交由用户在 IDE 里解决，工具不尝试自动合并。
- 所有命令的 stdout / stderr 原样透传到界面。

### 7.5 图片

- 拖入即处理：长边超过 2000px 等比缩小，转 WebP（可配置），单张上限 300KB，超出提示。
- 命名 `{slug}-01.webp`，落在 Profile 指定的 assets 目录。
- 回填引用按 `assets.reference` 模板生成；Astro 走相对路径以启用构建优化，Hugo 走 `/images/xxx` 绝对路径。
- 同一篇文章的图片集中命名，删除文章时不自动删图（避免误删被复用的图）。

### 7.6 校验

| engine | 校验来源 |
| --- | --- |
| astro | 动态加载站点的 `content.config.ts`，直接用它的 zod schema |
| 其他 | 用 Profile 的 `fields` + `taxonomy` 约束生成校验规则 |

Astro 项目用 `jiti` 在运行时加载 TS 配置，这样站点加字段，工具自动跟上，不需要两边同步。

---

## 8. 界面

三栏 + 底部提交条：

| 区域 | 内容 |
| --- | --- |
| 顶栏 | 当前仓库、分支、未提交数、本地预览、推送 |
| 左栏 | 搜索、全部/草稿筛选、文章列表（日期 + 标题 + 分类色点）、新建、导入 |
| 中栏 | 工具栏、编辑器 / 预览切换（或分屏）、字数与校验状态 |
| 右栏 | Front matter 表单：标题、URL、摘要（带字数）、分类（下拉或单选组）、标签（chips）、语言、日期、封面、置顶 / 草稿 |
| 底栏 | commit 信息、变更统计、提交按钮 |

交互要点：

- 分类用**单选按钮组或下拉**（栏目是封闭概念），标签用**可增删的 chips**（自由词）。两者的视觉必须区分开，否则用户会混。
- 分类未选、摘要超长、标签超量时，底栏提交按钮保持可点但显示原因，点击后定位到对应字段——不要静默禁用。
- 编辑器与表单改动后标记「未保存」，切换文章前确认。

---

## 9. 失败与边界

| 情况 | 处理 |
| --- | --- |
| 仓库不是 git 仓库 | 拒绝进入，提示 `git init` 或换目录 |
| 没有远程仓库 | 允许本地 commit，禁止 push，提示配置 remote |
| 凭据过期 | 原样显示 git 报错，提示在终端执行一次 `git push` 完成认证 |
| 构建失败 | 若开启 `checkBeforePush`，不阻断提交但阻断推送 |
| 文件被外部修改 | 拒绝写入，要求重新加载 |
| 分类字段站点不存在 | 保存前提示「站点可能不识别该字段」，允许继续（用户可能正在改站点） |
| 图片过大 | 压缩后仍超限则拒绝并说明 |

---

## 10. 里程碑

| 阶段 | 内容 | 完成定义 |
| --- | --- | --- |
| M0 | 工作区选择、探测、Profile、文章列表 | 能打开一个 Hugo/Hexo/Astro 仓库并列出全部文章 |
| M1 | 编辑、保存、front matter 保真、git 提交推送 | 新建一篇文章并成功发布，原文件的注释与未知字段不丢 |
| M2 | 分类、标签、图片、预览 | 分类单选、标签多选、拖图自动落盘回填 |
| M3 | 导入、URL 变更提示、批量操作 | 导入一篇外部 md 并正确接管 |
| M4 | 打磨与打包 | 双击 start.bat 即用，无控制台窗口 |

**M1 结束即可投入使用**，M2 是体验提升，不要反过来先做界面细节。

---

## 11. 验收清单

- [ ] 打开 Hugo、Hexo、Jekyll、Astro 四种仓库，均能正确识别目录并列出文章。
- [ ] 保存一篇文章后，`git diff` 只包含被修改的行，未知 front matter 字段与注释原样保留。
- [ ] TOML front matter 保存后注释不丢失。
- [ ] 新建文章时分类只能单选、标签可多选，取值与站点一致。
- [ ] 提交只包含本次涉及的文件，IDE 里的其他改动不被带入。
- [ ] push 失败后本地 commit 保留，重试成功。
- [ ] 文件被外部修改后保存被拒绝，重新加载后正常。
- [ ] 图片拖入后自动压缩、改名、落盘、回填引用，预览可见。
- [ ] 改 slug 时提示 URL 变化。
- [ ] 中文标题能生成可用 slug，不出现 `%E4%B8%AD`。
- [ ] 所有 git 报错在界面上可见，不被吞掉。

---

## 12. 站点侧需要配合的改动

工具依赖站点先具备「分类」概念。博客站点在开发分类功能时需要同步完成：

| 改动 | 说明 |
| --- | --- |
| `content.config.ts` | 增加 `categories` 字段（单选，枚举或自由字符串） |
| 路由 | 新增 `/categories/` 索引页与 `/categories/{slug}/` 列表页 |
| 文章页 | 标题下方显示所属分类，可点击跳转 |
| 归档与 RSS | 分类信息进入 RSS 分类字段与 sitemap |
| 搜索 | 分类名可被搜索命中 |

**分类与标签的模型约定**（工具与站点必须一致）：

| | 分类 categories | 标签 tags |
| --- | --- | --- |
| 语义 | 栏目，回答「这是什么」 | 关键词，回答「涉及什么」 |
| 数量 | 一篇文章 1 个（推荐单选） | 一篇文章 1–5 个 |
| 取值 | 封闭集合，由作者维护 | 开放集合，随手新建 |
| 是否必填 | 建议必填 | 可空 |

这条约定写清楚，工具的表单、站点的路由、未来的统计才能对齐。

---

## 13. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| front matter 保真做不到位 | 用户仓库被格式化，产生大量无意义 diff | 三级策略 + 写盘前 diff 预览 |
| 各框架语义差异被低估 | 支持面看起来宽，实际每个都要单独调 | 先做 Astro + Hugo 两个，验证抽象是否成立 |
| 与 IDE 同时编辑 | 覆盖用户改动 | hash 检测 + 拒绝写入 |
| 工具自己成为维护负担 | 用两次就弃用 | 不引入框架级依赖，核心逻辑控制在几千行内 |
| 分类模型与站点不一致 | 工具能写但站点不显示 | 第 12 章的约定作为开发前置条件 |
