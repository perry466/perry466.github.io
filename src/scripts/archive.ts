/**
 * 归档页交互：
 *
 * 1. 年份条跟随滚动高亮当前年份（IntersectionObserver，不监听 scroll 事件）。
 * 2. 密度格悬停/聚焦时，给下方对应的月份块加一圈高亮，把「几月」和「哪一块」连起来。
 * 3. 点密度格跳转到已折叠的月份时，先把它展开，否则会落在一个收起的标题上。
 *
 * 没有 JS 时：年份条退化成普通锚点，月份是原生 <details>，仍然可用。
 */
export function initArchive(): void {
  const rail = document.querySelector<HTMLElement>("[data-archive-rail]");
  const years = Array.from(document.querySelectorAll<HTMLElement>("[data-archive-year]"));
  if (!rail || years.length === 0) return;

  const items = Array.from(rail.querySelectorAll<HTMLAnchorElement>("[data-rail-year]"));

  const setActive = (year: string | undefined): void => {
    for (const item of items) {
      const active = item.dataset.railYear === year;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    }
  };

  setActive(years[0]?.dataset.archiveYear);

  /**
   * 按「年份块顶部是否越过判定线」来选当前年份。
   *
   * 这里不用 IntersectionObserver：块高差很大（一个月和十几个月），
   * 用一条固定判定线比 rootMargin 更好推理，也不会出现两块同时命中时来回跳。
   */
  const update = (): void => {
    const line = window.innerHeight * 0.34;
    let current = years[0];
    for (const year of years) {
      if (year.getBoundingClientRect().top <= line) current = year;
    }
    setActive(current?.dataset.archiveYear);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  document.querySelectorAll<HTMLElement>("[data-strip-month]").forEach((cell) => {
    const key = cell.dataset.stripMonth;
    if (!key) return;
    const panel = document.querySelector<HTMLElement>(`[data-month-panel="${key}"]`);
    if (!panel) return;

    const on = (): void => panel.classList.add("is-hot");
    const off = (): void => panel.classList.remove("is-hot");

    cell.addEventListener("mouseenter", on);
    cell.addEventListener("mouseleave", off);
    cell.addEventListener("focus", on);
    cell.addEventListener("blur", off);

    cell.addEventListener("click", () => {
      if (panel instanceof HTMLDetailsElement && !panel.open) panel.open = true;
    });
  });
}
