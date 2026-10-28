/**
 * 站点唯一配置入口。
 * 组件与页面不得硬编码站点名、导航、作者、功能开关与第三方 ID。
 */

export type Locale = "zh" | "en";

export interface NavItem {
  label: string;
  labelEn: string;
  href: string;
  /** 下拉来源：categories 表示按 site.categories 动态生成分类面板 */
  dropdown?: "categories";
}

/**
 * 分类（栏目）定义：一篇文章只属于一个分类，取值是封闭集合。
 * slug 同时是 front matter 里 `category` 的取值与 URL 片段，发布后不要改。
 */
export interface CategoryItem {
  slug: string;
  label: string;
  labelEn: string;
  description?: string;
}

export const site = {
  /** 站点名：中文用于标题与页头，英文用于双语切换 */
  name: "留白",
  nameEn: "Whitespace",
  /** 站点定位，用于首页 title 与 SEO。只有一份：内容不随界面语言切换 */
  description: "技术、项目与长期记录",
  /** 生产地址，必须与部署地址一致（canonical / RSS / sitemap） */
  url: "https://perry466.github.io",
  /**
   * 署名：全站唯一来源，改这一处即可。
   * 只有一个作者，不随界面语言变化（英文页面也显示同一个名字）。
   * 同时作用于：文章页脚版权、文章 JSON-LD 的 author / publisher、og:article:author、
   * 首页右下角介绍卡片的名字、关于页首句。其他文件不要再写死名字。
   */
  author: "林一",
  /** 建站年份，用于页脚版权区间 */
  startYear: 2026,
  /** 默认语言：无 JS 与首次访问时使用 */
  defaultLocale: "zh" as Locale,
  locales: ["zh", "en"] as const,
  /** 列表分页大小 */
  postsPerPage: 10,
  /** 首页置顶最多显示篇数 */
  maxPinned: 3,
  /** 相关文章最多显示篇数 */
  maxRelated: 3,

  nav: [
    { label: "文章", labelEn: "Posts", href: "/posts/" },
    { label: "分类", labelEn: "Categories", href: "/categories/", dropdown: "categories" },
    { label: "归档", labelEn: "Archive", href: "/archive/" },
    { label: "标签", labelEn: "Tags", href: "/tags/" },
    { label: "关于", labelEn: "About", href: "/about/" },
  ] satisfies NavItem[],

  /**
   * 分类表：栏目（单选、封闭集合）。front matter 的 `category` 只能取这里的 slug，
   * 写错会在构建期由 zod 直接报错。
   * 没有写 `category` 的文章归到 categoryDefault 指向的那一项。
   */
  categories: [
    {
      slug: "tech",
      label: "技术",
      labelEn: "Tech",
      description: "实现细节、工具链与踩过的坑。",
    },
    {
      slug: "diary",
      label: "日记",
      labelEn: "Diary",
      description: "按时间记下的片段，不做整理。",
    },
    {
      slug: "essay",
      label: "随笔",
      labelEn: "Essay",
      description: "想法、阅读与摘记。",
    },
    {
      slug: "notes",
      label: "笔记",
      labelEn: "Notes",
      description: "成体系的整理，方便回头复习。",
    },
    {
      slug: "uncategorized",
      label: "未分类",
      labelEn: "Uncategorized",
      description: "还没归入栏目的文章。",
    },
  ] as CategoryItem[],

  /** 没有写 category 字段时的归属（必须是上面 categories 里的 slug） */
  categoryDefault: "uncategorized",

  social: [
    { label: "GitHub", href: "https://github.com/perry466" },
    { label: "RSS", href: "/rss.xml" },
  ],

  /** 首页自我介绍（当前为测试用的虚构人设，不是真实个人信息） */
  hero: {
    /**
     * 首页开屏的打字机句子：逐行「打出 → 停住 → 删除 → 下一句」循环。
     * 1–4 句最好，每句控制在 20 字以内，否则一行放不下会折行。
     *
     * 只有这一份：这是你写的内容，切换界面语言不会换掉它。
     * 语言开关只切换导航、按钮这类界面文字，不切换正文与配置里的内容。
     */
    lines: [
      "古之学者为己，今之学者为人。",
      "Dump people can come up with smart ideas.",
      
    ],
    /**
     * 名字不放这里：介绍卡片的名字统一取顶部的 `author`，
     * 避免出现「卡片叫一个名字、页脚版权叫另一个」。
     */
    bio: "前端工程师，做界面也做工具链。这里存着些写不完的笔记：技术细节、读书摘录，和一些值得记下来的日常。",
  },

  /** 功能开关：关掉后不产生任何第三方请求 */
  features: {
    comments: false,
    analytics: false,
    lightbox: true,
    /** 文章底部复制链接按钮 */
    sharelink: true,
  },

  /**
   * RSS 订阅行为。
   * 全量输出：订阅者能在阅读器里翻到全部历史文章；代价是 rss.xml 随文章数变大
   * （当前 20 篇全文约 110KB，50 篇约 280KB，主流阅读器都能接受）。
   */
  rss: {
    /** 最多输出多少篇；0 表示不限制，输出全部已发布文章 */
    maxItems: 0,
    /** true 输出全文（content:encoded），false 只输出摘要 */
    fullText: true,
  },

  /** 结构与布局开关 */
  ui: {
    stickyHeader: true,
    showHomeHero: true,
    /** list：细线列表；card：卡片网格 */
    postListStyle: "list" as "list" | "card",
    showReadingProgress: true,
    showWordCount: true,
    /** 首页右下角「个人介绍」浮层显示多久自动收起（毫秒）；0 表示不显示 */
    introCardMs: 10000,
  },

  /** Giscus 评论：四项齐全且 features.comments 为 true 才加载 */
  giscus: {
    repo: "",
    repoId: "",
    category: "",
    categoryId: "",
  },

  /** Umami 统计：两项齐全且 features.analytics 为 true 才加载 */
  umami: {
    src: "",
    websiteId: "",
  },

  /** 正文版权声明 */
  copyright: "CC BY-NC-SA 4.0",
  copyrightUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans",
  /** ICP 备案号：留空则不显示 */
  icp: "",
};

export type SiteConfig = typeof site;
