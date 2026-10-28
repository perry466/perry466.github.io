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
  descriptionEn?: string;
}

export const site = {
  /** 站点名：中文用于标题与页头，英文用于双语切换 */
  name: "留白",
  nameEn: "Whitespace",
  /** 站点定位，用于首页 title 与 SEO */
  description: "技术、项目与长期记录",
  descriptionEn: "Notes on technology, projects, and the long run",
  /** 生产地址，必须与部署地址一致（canonical / RSS / sitemap） */
  url: "https://perry466.github.io",
  /** 占位：换成你自己的名字 */
  author: "示例作者",
  authorEn: "Site Author",
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
      descriptionEn: "Implementation details, tooling, and things that broke.",
    },
    {
      slug: "diary",
      label: "日记",
      labelEn: "Diary",
      description: "按时间记下的片段，不做整理。",
      descriptionEn: "Short entries kept in order, left unedited.",
    },
    {
      slug: "essay",
      label: "随笔",
      labelEn: "Essay",
      description: "想法、阅读与摘记。",
      descriptionEn: "Thoughts, reading, and excerpts.",
    },
    {
      slug: "notes",
      label: "笔记",
      labelEn: "Notes",
      description: "成体系的整理，方便回头复习。",
      descriptionEn: "Structured notes meant to be revised.",
    },
    {
      slug: "uncategorized",
      label: "未分类",
      labelEn: "Uncategorized",
      description: "还没归入栏目的文章。",
      descriptionEn: "Posts not yet filed under a category.",
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
    title: "林一",
    titleEn: "Lin Yi",
    tagline: "写代码，也写代码之外的事。",
    taglineEn: "Writing code, and the things around it.",
    bio: "前端工程师，做界面也做工具链。这个站点存着些写不完的笔记：技术细节、读书摘录，还有一些没什么用但值得记下来的日常。",
    bioEn: "A front-end engineer who works on interfaces and the tooling behind them. This site holds the unfinished notes: technical details, reading excerpts, and a few everyday things worth writing down for no practical reason.",
  },

  /** 功能开关：关掉后不产生任何第三方请求 */
  features: {
    comments: false,
    analytics: false,
    lightbox: true,
    /** 文章底部复制链接按钮 */
    sharelink: true,
  },

  /** 结构与布局开关 */
  ui: {
    stickyHeader: true,
    showHomeHero: true,
    /** list：细线列表；card：卡片网格 */
    postListStyle: "list" as "list" | "card",
    showReadingProgress: true,
    showWordCount: true,
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
