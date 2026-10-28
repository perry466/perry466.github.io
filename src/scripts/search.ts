import { onLocaleChange, s } from "./i18n-client";

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta?: { title?: string };
}

interface PagefindModule {
  options?: (options: Record<string, unknown>) => Promise<void>;
  search: (
    query: string,
    options?: { filters?: Record<string, string> },
  ) => Promise<{ results: { data: () => Promise<PagefindResultData> }[] }>;
}

let pagefind: PagefindModule | null = null;
let loading: Promise<PagefindModule | null> | null = null;
let unavailable = false;

/** 按需加载构建期生成的索引；缺失时返回 null，由界面提示而不是抛错。 */
async function loadPagefind(): Promise<PagefindModule | null> {
  if (pagefind) return pagefind;
  if (unavailable) return null;
  if (loading) return loading;

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = `${base}/pagefind/pagefind.js`;

  loading = (async () => {
    try {
      const mod = (await import(/* @vite-ignore */ path)) as PagefindModule;
      await mod.options?.({ excerptLength: 28 });
      pagefind = mod;
      return mod;
    } catch {
      unavailable = true;
      return null;
    }
  })();

  return loading;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** 标题不经过 Pagefind 高亮，这里自行标记，先转义再插入 mark，避免 XSS。 */
function highlight(text: string, query: string): string {
  const safe = escapeHtml(text);
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (terms.length === 0) return safe;
  return safe.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");
}

/** Pagefind 的 excerpt 已含 <mark>，只允许该标签，其余转义。 */
function safeExcerpt(excerpt: string): string {
  return escapeHtml(excerpt.replace(/<\/?mark>/g, "\u0000")).replace(
    /\u0000(.*?)\u0000/g,
    (_, inner: string) => `<mark>${inner}</mark>`,
  );
  // 说明：先用占位符保留 mark 标签位置，转义其余内容后再还原。
}

function normalizePath(url: string): string {
  const clean = url.split("#")[0] ?? url;
  return clean.length > 1 && !clean.endsWith("/") ? `${clean}/` : clean;
}

export function initSearch(): void {
  const root = document.querySelector<HTMLElement>("[data-search-root]");
  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  const list = document.querySelector<HTMLElement>("[data-search-results]");
  const hint = document.querySelector<HTMLElement>("[data-search-hint]");
  const status = document.querySelector<HTMLElement>("[data-search-status]");
  if (!root || !input || !list) return;

  const html = document.documentElement;
  const initialHint = hint?.innerHTML ?? "";
  let lastFocus: HTMLElement | null = null;
  let activeIndex = -1;
  let timer: number | undefined;
  let requestId = 0;

  /** initial：恢复初始说明；hidden：隐藏；其余字符串：显示该提示 */
  const setHint = (mode: "initial" | "hidden" | string): void => {
    if (!hint) return;
    if (mode === "hidden") {
      hint.hidden = true;
      return;
    }
    hint.hidden = false;
    if (mode === "initial") hint.innerHTML = initialHint;
    else hint.textContent = mode;
  };

  const setStatus = (text: string): void => {
    if (!status) return;
    status.hidden = text.length === 0;
    status.textContent = text;
  };

  const open = (): void => {
    if (root.classList.contains("is-open")) return;
    lastFocus = document.activeElement as HTMLElement | null;
    root.classList.add("is-open");
    html.classList.add("is-locked");
    input.focus();
    void loadPagefind().then((mod) => {
      if (!mod) setStatus(s("searchIndexMissing"));
    });
  };

  const close = (): void => {
    if (!root.classList.contains("is-open")) return;
    root.classList.remove("is-open");
    html.classList.remove("is-locked");
    (lastFocus ?? input).focus();
  };

  const items = (): HTMLAnchorElement[] =>
    Array.from(list.querySelectorAll<HTMLAnchorElement>("a.search-result"));

  const setActive = (index: number): void => {
    const all = items();
    if (all.length === 0) return;
    activeIndex = (index + all.length) % all.length;
    all.forEach((item, i) => {
      item.classList.toggle("is-active", i === activeIndex);
      item.setAttribute("aria-selected", String(i === activeIndex));
    });
    const active = all[activeIndex];
    if (active?.id) input.setAttribute("aria-activedescendant", active.id);
    active?.scrollIntoView({ block: "nearest" });
  };

  const render = (results: PagefindResultData[], query: string): void => {
    list.innerHTML = "";
    activeIndex = -1;

    if (results.length === 0) {
      setHint(`${s("searchEmpty")} · ${s("searchEmptyHint")}`);
      setStatus("");
      return;
    }

    setHint("hidden");
    setStatus(s("searchResults").replace("{n}", String(results.length)));

    const frag = document.createDocumentFragment();
    results.forEach((data, index) => {
      const li = document.createElement("li");
      li.setAttribute("role", "none");
      const url = normalizePath(data.url);

      const link = document.createElement("a");
      link.className = "search-result";
      link.href = url;
      link.id = `search-option-${index}`;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");

      const title = document.createElement("div");
      title.className = "search-result__title";
      title.innerHTML = highlight(data.meta?.title ?? url, query);

      const excerpt = document.createElement("div");
      excerpt.className = "search-result__excerpt";
      excerpt.innerHTML = safeExcerpt(data.excerpt ?? "");

      const path = document.createElement("div");
      path.className = "search-result__path";
      path.textContent = url;

      link.append(title, excerpt, path);
      li.append(link);
      frag.append(li);
    });

    list.append(frag);
  };

  const run = async (query: string): Promise<void> => {
    const current = ++requestId;
    const mod = await loadPagefind();
    if (current !== requestId) return;

    if (!mod) {
      list.innerHTML = "";
      setHint("hidden");
      setStatus(s("searchIndexMissing"));
      return;
    }

    // 不按界面语言过滤：列表与归档都同时展示中英文文章，搜索也保持一致
    const search = await mod.search(query);
    if (current !== requestId) return;

    const slice = search.results.slice(0, 10);
    const data = await Promise.all(slice.map((result) => result.data()));
    if (current !== requestId) return;

    render(data, query);
  };

  input.addEventListener("input", () => {
    const query = input.value.trim();
    window.clearTimeout(timer);

    if (query.length === 0) {
      requestId += 1;
      list.innerHTML = "";
      setStatus("");
      input.removeAttribute("aria-activedescendant");
      setHint("initial");
      return;
    }

    setStatus(s("searchLoading"));
    timer = window.setTimeout(() => {
      void run(query);
    }, 140);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === "Enter") {
      const all = items();
      const target = all[activeIndex] ?? all[0];
      if (target) {
        event.preventDefault();
        window.location.href = target.href;
      }
    }
  });

  document.querySelectorAll<HTMLElement>("[data-search-open]").forEach((btn) => {
    btn.addEventListener("click", open);
  });

  document.querySelectorAll<HTMLElement>("[data-search-close]").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = root.classList.contains("is-open");
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      isOpen ? close() : open();
      return;
    }
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
      return;
    }
    // 单键 "/" 在非输入状态下打开面板
    const target = event.target as HTMLElement | null;
    const typing =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable === true;
    if (!isOpen && event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      open();
    }
  });

  onLocaleChange(() => {
    if (status?.hidden === false && input.value.trim().length === 0) setStatus("");
    if (input.value.trim().length === 0) setHint("initial");
  });
}
