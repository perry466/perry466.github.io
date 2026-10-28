import type { Locale } from "../site.config";

const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * 统一按北京时间取年月日。
 *
 * 构建跑在 UTC（GitHub Actions），本机是 +08:00。文章时间现在来自 git 提交时间、带具体时刻，
 * 如果直接用 getDate()，北京时间凌晨推送的文章在 CI 上会被算成前一天。
 */
const TIME_ZONE = "Asia/Shanghai";

const ZONED = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function zoned(date: Date): { year: number; month: number; day: number } {
  const parts = ZONED.formatToParts(date);
  const pick = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

/** 机器可读与列表用：2026-10-28 */
export function formatISO(date: Date): string {
  const { year, month, day } = zoned(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 只取年份，归档分组用 */
export function formatYear(date: Date): string {
  return String(zoned(date).year);
}

/** 列表左侧的「月-日」：10-28 */
export function formatMonthDay(date: Date): string {
  const { month, day } = zoned(date);
  return `${pad(month)}-${pad(day)}`;
}

/** 文章页长日期 */
export function formatLong(date: Date, locale: Locale): string {
  if (locale === "en") {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: TIME_ZONE,
    });
  }
  const { year, month, day } = zoned(date);
  return `${year} 年 ${month} 月 ${day} 日`;
}

/** datetime 属性用：输出完整时间，别把具体时刻丢掉 */
export function toDateTime(date: Date): string {
  return date.toISOString();
}
