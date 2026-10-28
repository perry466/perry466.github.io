/**
 * 首页开屏的打字机效果。
 *
 * 逐字打出 → 停一会儿 → 逐字删除 → 下一句，循环。句子在 site.config 的 hero.lines 里配，
 * 只有一份：这是你写的内容，切换界面语言不会换掉它（语言开关只管界面文字）。
 * 降级：没有 JS 时页面上就是第一句静态文字；prefers-reduced-motion 时不打字，直接显示第一句。
 */
const TYPE_MS = 78;
const DELETE_MS = 34;
const HOLD_MS = 2200;
const GAP_MS = 420;

export function initTypedHero(): void {
  const target = document.querySelector<HTMLElement>("[data-typed]");
  if (!target) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(target.dataset.typedLines ?? "[]");
  } catch {
    return;
  }

  // 配置里可能留了空行或空串（手改 site.config 时很容易多一个逗号），
  // 空句子会让打字停在原地，必须在入口就过滤掉
  const lines = (Array.isArray(parsed) ? parsed : [])
    .map((line) => String(line).trim())
    .filter((line) => line !== "");

  if (lines.length === 0) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = 0;
  let count = 0;
  let deleting = false;
  let timer = 0;

  const stop = (): void => window.clearTimeout(timer);

  const show = (text: string): void => {
    target.textContent = text;
  };

  const step = (): void => {
    const text = lines[index] ?? "";
    if (!text) return;

    if (deleting) {
      count -= 1;
      show(text.slice(0, count));
      if (count <= 0) {
        deleting = false;
        index = (index + 1) % lines.length;
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
      if (lines.length === 1) return;
      deleting = true;
      timer = window.setTimeout(step, HOLD_MS);
      return;
    }
    timer = window.setTimeout(step, TYPE_MS);
  };

  const restart = (): void => {
    stop();
    index = 0;
    count = 0;
    deleting = false;
    if (reduceMotion.matches) {
      show(lines[0] ?? "");
      target.dataset.ready = "1";
      return;
    }
    show("");
    target.dataset.ready = "1";
    timer = window.setTimeout(step, 260);
  };

  restart();
  reduceMotion.addEventListener("change", restart);
}
