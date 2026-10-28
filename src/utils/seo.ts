import { site } from "../site.config";

/** 站内路径转绝对地址，用于 canonical / OG / JSON-LD */
export function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, "");
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 规范路径：去掉查询串与 hash，补齐结尾斜杠，与 trailingSlash: "always" 保持一致 */
export function canonicalPath(pathname: string): string {
  const clean = pathname.split("#")[0]?.split("?")[0] ?? "/";
  if (clean === "/") return "/";
  return clean.endsWith("/") ? clean : `${clean}/`;
}

export interface PageTitleOptions {
  /** 页面标题（不含站点名）；为空表示首页 */
  title?: string;
  /** 是否追加站点名 */
  withSiteName?: boolean;
  /** 输出语言：决定站点名与分隔符（英文界面用 Whitespace 和半角竖线） */
  locale?: "zh" | "en";
}

export function pageTitle({
  title,
  withSiteName = true,
  locale = "zh",
}: PageTitleOptions = {}): string {
  const name = locale === "en" ? site.nameEn : site.name;
  const sep = locale === "en" ? " | " : "｜";
  if (!title) {
    // 站点描述只有一份（内容不随界面语言切换），只有站点名按语言取
    return `${name}${sep}${site.description}`;
  }
  if (!withSiteName) return title;
  return `${title}${sep}${name}`;
}

/** 默认分享图（1200×630），没有封面时使用 */
export const defaultOgImage = "/images/og-default.png";

/** 面包屑 JSON-LD：文章页与列表页共用 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: site.nameEn,
    url: absoluteUrl("/"),
    description: site.description,
    author: { "@type": "Person", name: site.author },
    inLanguage: site.defaultLocale === "zh" ? "zh-CN" : "en",
  };
}
