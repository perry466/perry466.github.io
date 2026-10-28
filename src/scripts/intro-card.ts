/**
 * 首页右下角的个人介绍浮层。
 *
 * 规则：进页面出现，倒计时结束自动收起；也可以手动关闭。
 * 鼠标悬停或用键盘聚焦时暂停计时——正在读的时候不该被收走。
 * 收起后写 sessionStorage，同一次会话里不再反复弹出。
 */
const DISMISS_KEY = "whitespace:intro-dismissed";
const LEAVE_MS = 220;

export function initIntroCard(): void {
  const card = document.querySelector<HTMLElement>("[data-intro]");
  if (!card) return;

  const total = Number(card.dataset.introDuration ?? "0");
  if (!total) return;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

  const closeButton = card.querySelector<HTMLElement>("[data-intro-close]");
  const bar = card.querySelector<HTMLElement>("[data-intro-bar]");

  let remaining = total;
  let startedAt = 0;
  let timer = 0;
  let dismissed = false;

  const clear = (): void => {
    window.clearTimeout(timer);
  };

  const dismiss = (remember: boolean): void => {
    if (dismissed) return;
    dismissed = true;
    clear();
    if (remember) sessionStorage.setItem(DISMISS_KEY, "1");
    card.classList.remove("is-visible");
    card.classList.add("is-leaving");
    window.setTimeout(() => {
      card.hidden = true;
    }, LEAVE_MS);
  };

  const resume = (): void => {
    if (dismissed || remaining <= 0) return;
    startedAt = performance.now();
    if (bar) bar.style.animationPlayState = "running";
    timer = window.setTimeout(() => dismiss(true), remaining);
  };

  const pause = (): void => {
    if (dismissed) return;
    clear();
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
    if (bar) bar.style.animationPlayState = "paused";
  };

  card.hidden = false;
  // 强制一次重排：hidden 去掉后如果立刻加类，过渡不会触发
  void card.offsetWidth;
  card.classList.add("is-visible");
  if (bar) bar.style.animationDuration = `${total}ms`;
  resume();

  card.addEventListener("mouseenter", pause);
  card.addEventListener("mouseleave", resume);
  card.addEventListener("focusin", pause);
  card.addEventListener("focusout", resume);
  closeButton?.addEventListener("click", () => dismiss(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dismissed) dismiss(true);
  });
}
