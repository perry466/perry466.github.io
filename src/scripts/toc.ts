/** 目录高亮与阅读进度：只在文章页加载。 */
export function initToc(): void {
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>(".prose :is(h2, h3)[id]"),
  );
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".toc__list a[href^='#']"));
  const bar = document.querySelector<HTMLElement>("[data-progress]");

  const byId = new Map<string, HTMLAnchorElement[]>();
  for (const link of links) {
    const id = decodeURIComponent(link.hash.slice(1));
    const list = byId.get(id);
    if (list) list.push(link);
    else byId.set(id, [link]);
  }

  let activeId = "";

  const setActive = (id: string): void => {
    if (!id || id === activeId) return;
    activeId = id;
    for (const [key, items] of byId) {
      const on = key === id;
      for (const item of items) {
        item.classList.toggle("is-active", on);
        if (on) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      }
    }
  };

  const updateProgress = (): void => {
    if (!bar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.setProperty("--progress", ratio.toFixed(4));
  };

  const updateActive = (): void => {
    if (headings.length === 0) return;
    const threshold = 120;
    let current = "";
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top - threshold <= 0) current = heading.id;
      else break;
    }
    if (!current) current = headings[0]?.id ?? "";
    setActive(current);
  };

  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateActive();
      updateProgress();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateActive();
  updateProgress();

  // 点击目录后收起移动端折叠面板
  document.querySelectorAll<HTMLAnchorElement>(".toc-inline a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
      const details = link.closest("details");
      if (details) window.setTimeout(() => details.removeAttribute("open"), 120);
    });
  });
}
