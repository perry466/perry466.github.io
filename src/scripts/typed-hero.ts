/**
 * 首页开屏的打字机效果。
 *
 * 逐字打出 → 停一会儿 → 逐字删除 → 下一句，循环。句子在 site.config 的 hero.lines 里配。
 * 降级：没有 JS 时页面上就是第一句静态文字；prefers-reduced-motion 时不打字，直接显示第一句。
 */
const TYPE_MS = 78;
const DELETE_MS = 34;
const HOLD_MS = 2200;
const GAP_MS = 420;

type Lines = { zh: string[]; en: string[] };

export function initTypedHero(): void {
  const target = document.querySelector<HTMLElement>("[data-typed]");
  if (!target) return;

  let lines: Lines;
  try {
    lines = JSON.parse(target.dataset.typedLines ?? "{}") as Lines;
  } catch {
    return;
  }

  const currentLang = (): keyof Lines =>
    document.documentElement.dataset.locale === "en" ? "en" : "zh";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let lang: keyof Lines = currentLang();
  let index = 0;
  let count = 0;
  let deleting = false;
  let timer = 0;

  const stop = (): void => window.clearTimeout(timer);

  const show = (text: string): void => {
    target.textContent = text;
  };

  const step = (): void => {
    const list = lines[lang] ?? [];
    const text = list[index] ?? "";
    if (!text) return;

    if (deleting) {
      count -= 1;
      show(text.slice(0, count));
      if (count <= 0) {
        deleting = false;
        index = (index + 1) % list.length;
        timer = window.setTimeout(step, GAP_MS);
        return;
      }
      timer = window.setTimeout(step, DELETE_MS);
      return;
    }

    count += 1;
    show(text.slice(0, count));
    if (count >= text.length) {
      // 只有一句时停在原地，反复打了又删反而吵
      if (list.length === 1) return;
      deleting = true;
      timer = window.setTimeout(step, HOLD_MS);
      return;
    }
    timer = window.setTimeout(step, TYPE_MS);
  };

  const restart = (): void => {
    stop();
    lang = currentLang();
    index = 0;
    count = 0;
    deleting = false;
    const list = lines[lang] ?? [];
    if (reduceMotion.matches || list.length === 0) {
      show(list[0] ?? "");
      target.dataset.ready = "1";
      return;
    }
    show("");
    target.dataset.ready = "1";
    timer = window.setTimeout(step, 260);
  };

  restart();
  // 切换语言时从头开始，避免半句中文接着半句英文
  document.addEventListener("localechange", restart);
  reduceMotion.addEventListener("change", restart);
}
