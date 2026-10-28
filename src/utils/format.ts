import type { Locale } from "../site.config";

const pad = (n: number): string => String(n).padStart(2, "0");

/** 机器可读与列表用：2026-10-28 */
export function formatISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 列表左侧的「月-日」：10-28 */
export function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 文章页长日期 */
export function formatLong(date: Date, locale: Locale): string {
  if (locale === "en") {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Shanghai",
    });
  }
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/** datetime 属性用 */
export function toDateTime(date: Date): string {
  return `${formatISO(date)}T00:00:00+08:00`;
}
