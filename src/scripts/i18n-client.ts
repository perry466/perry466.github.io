/** 浏览器端共用的语言读取与文案获取（文案由 BaseLayout 注入到页面内 JSON）。 */

export type Locale = "zh" | "en";

type Dict = Record<string, Record<Locale, string>>;

let dict: Dict | null = null;

export function currentLocale(): Locale {
  return document.documentElement.dataset.locale === "en" ? "en" : "zh";
}

function loadDict(): Dict {
  if (dict) return dict;
  const node = document.getElementById("site-i18n");
  try {
    dict = node ? (JSON.parse(node.textContent ?? "{}").strings as Dict) : {};
  } catch {
    dict = {};
  }
  return dict ?? {};
}

/** 取客户端文案；缺失时返回空串，避免界面出现 undefined */
export function s(key: string): string {
  const table = loadDict();
  return table[key]?.[currentLocale()] ?? "";
}

/** 语言切换后需要重新渲染的界面元素订阅此事件 */
export function onLocaleChange(handler: () => void): void {
  document.addEventListener("localechange", handler);
}
