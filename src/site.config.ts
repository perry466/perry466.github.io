/**
 * 站点唯一配置入口。
 * 组件与页面不得硬编码站点名、导航、作者、功能开关与第三方 ID。
 */

export type Locale = "zh" | "en";

export interface NavItem {
  label: string;
  labelEn: string;
  href: string;
}

export const site = {
  /** 站点名：中文用于标题与页头，英文用于双语切换 */
  name: "留白",
  nameEn: "Liubai",
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
    { label: "归档", labelEn: "Archive", href: "/archive/" },
    { label: "标签", labelEn: "Tags", href: "/tags/" },
    { label: "关于", labelEn: "About", href: "/about/" },
  ] satisfies NavItem[],

  social: [
    { label: "GitHub", href: "https://github.com/perry466" },
    { label: "RSS", href: "/rss.xml" },
  ],

  /** 首页自我介绍 */
  /** 首页自我介绍：全部为占位文案，替换成你自己的 */
  hero: {
    title: "示例作者",
    titleEn: "Site Author",
    tagline: "这里写一句自我介绍。",
    taglineEn: "One line about yourself goes here.",
    bio: "这里写一段话介绍你在做什么、关注什么。示例文案仅用于展示排版，正式使用前请替换。",
    bioEn: "A short paragraph about what you do and what you care about. Placeholder copy for layout preview only — replace it before going live.",
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
