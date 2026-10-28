/** 正文图片灯箱：点击放大、左右切换、Esc 关闭。容器标记在 Lightbox.astro。 */
export function initLightbox(): void {
  const root = document.querySelector<HTMLElement>("[data-lightbox]");
  const image = root?.querySelector<HTMLImageElement>("[data-lightbox-img]");
  const counter = root?.querySelector<HTMLElement>("[data-lightbox-counter]");
  const caption = root?.querySelector<HTMLElement>("[data-lightbox-caption]");
  if (!root || !image) return;

  const items = Array.from(document.querySelectorAll<HTMLImageElement>(".prose img[data-zoomable]"));
  if (items.length === 0) return;

  const html = document.documentElement;
  let index = 0;
  let lastFocus: HTMLElement | null = null;

  const render = (): void => {
    const source = items[index];
    if (!source) return;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    if (counter) counter.textContent = `${index + 1} / ${items.length}`;
    if (caption) {
      caption.textContent = source.alt;
      caption.hidden = source.alt.trim().length === 0;
    }
  };

  const open = (nextIndex: number): void => {
    index = nextIndex;
    lastFocus = document.activeElement as HTMLElement | null;
    render();
    root.classList.add("is-open");
    html.classList.add("is-locked");
    root.querySelector<HTMLElement>("button")?.focus();
  };

  const close = (): void => {
    if (!root.classList.contains("is-open")) return;
    root.classList.remove("is-open");
    html.classList.remove("is-locked");
    image.removeAttribute("src");
    (lastFocus ?? document.body).focus();
  };

  const step = (delta: number): void => {
    if (items.length === 0) return;
    index = (index + delta + items.length) % items.length;
    render();
  };

  items.forEach((item, itemIndex) => {
    item.addEventListener("click", () => open(itemIndex));
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(itemIndex);
      }
    });
  });

  root.querySelectorAll<HTMLElement>("[data-lightbox-close]").forEach((btn) => {
    btn.addEventListener("click", close);
  });
  root.querySelector<HTMLElement>("[data-lightbox-prev]")?.addEventListener("click", () => step(-1));
  root.querySelector<HTMLElement>("[data-lightbox-next]")?.addEventListener("click", () => step(1));
  root.querySelector<HTMLElement>("[data-lightbox-backdrop]")?.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (!root.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowLeft") {
      step(-1);
    } else if (event.key === "ArrowRight") {
      step(1);
    }
  });
}
