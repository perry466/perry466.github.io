import { currentLocale, s } from "./i18n-client";
import { lockBackground } from "./focus";
import { readStore, writeStore } from "./storage";
import type { Locale } from "./i18n-client";

const html = document.documentElement;

const THEME_KEY = "whitespace:theme";
const LOCALE_KEY = "whitespace:locale";
/** 旧版本用 liubai: 前缀，只读兼容，写入一律走新 key */
const LEGACY_THEME_KEY = "liubai:theme";

/** 读偏好：存储不可用时返回 null，走默认值 */
function readStored(key: string, legacy: string): string | null {
  return readStore(key, legacy);
}

type Mode = "light" | "dark" | "system";

/* ---------------- 主题 ---------------- */
const MODE_ORDER: Mode[] = ["light", "dark", "system"];

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: Mode): void {
  html.dataset.mode = mode;
  html.dataset.theme = mode === "system" ? systemTheme() : mode;
  syncThemeButtons();
}

function themeLabel(mode: Mode): string {
  const label = s("themeLabel");
  const name =
    mode === "light" ? s("themeLight") : mode === "dark" ? s("themeDark") : s("themeSystem");
  return `${label}: ${name}`;
}

function syncThemeButtons(): void {
  const mode = (html.dataset.mode as Mode) || "system";
  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    const label = themeLabel(mode);
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  });
}

function initTheme(): void {
  if (!readStored(THEME_KEY, LEGACY_THEME_KEY)) html.dataset.mode = "system";
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (): void => {
    if ((html.dataset.mode as Mode) === "system") html.dataset.theme = systemTheme();
  };
  mq.addEventListener("change", onChange);

  document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = ((html.dataset.mode as Mode) || "system") as Mode;
      const next = MODE_ORDER[(MODE_ORDER.indexOf(mode) + 1) % MODE_ORDER.length] ?? "system";
      writeStore(THEME_KEY, next);
      applyMode(next);
    });
  });

  syncThemeButtons();
}

/* ---------------- 语言 ---------------- */
function applyLocale(locale: Locale): void {
  html.dataset.locale = locale;
  // 只切界面语言：<html lang> 表示正文语言，由服务端按文章语言输出，这里不要覆盖
  syncLocaleButtons();

  const title = document.querySelector<HTMLTitleElement>("title[data-title-zh]");
  if (title) {
    const next = locale === "en" ? title.dataset.titleEn : title.dataset.titleZh;
    if (next) document.title = next;
  }

  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  if (input) {
    const next = locale === "en" ? input.dataset.placeholderEn : input.dataset.placeholderZh;
    if (next) input.placeholder = next;
  }

  document.dispatchEvent(new CustomEvent("localechange"));
}

function syncLocaleButtons(): void {
  const locale = currentLocale();
  document.querySelectorAll<HTMLButtonElement>("[data-locale-btn]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.localeBtn === locale));
  });
}

function initLocale(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-locale-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next: Locale = btn.dataset.localeBtn === "en" ? "en" : "zh";
      if (next === currentLocale()) return;
      writeStore(LOCALE_KEY, next);
      applyLocale(next);
    });
  });
  syncLocaleButtons();
}

/* ---------------- 页头滚动状态 ---------------- */
function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;
  const update = (): void => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* ---------------- 移动端抽屉 ---------------- */
function initDrawer(): void {
  const drawer = document.querySelector<HTMLElement>("[data-drawer]");
  const opener = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  if (!drawer || !opener) return;

  let lastFocus: HTMLElement | null = null;
  let releaseLock: (() => void) | null = null;

  const open = (): void => {
    lastFocus = document.activeElement as HTMLElement | null;
    drawer.classList.add("is-open");
    html.classList.add("is-locked");
    opener.setAttribute("aria-expanded", "true");
    releaseLock = lockBackground(drawer);
    drawer.querySelector<HTMLElement>("a, button")?.focus();
  };

  const close = (): void => {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    html.classList.remove("is-locked");
    opener.setAttribute("aria-expanded", "false");
    releaseLock?.();
    releaseLock = null;
    (lastFocus ?? opener).focus();
  };

  opener.addEventListener("click", open);
  drawer.querySelectorAll<HTMLElement>("[data-menu-close]").forEach((node) => {
    node.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.matchMedia("(min-width: 768px)").addEventListener("change", (event) => {
    if (event.matches) close();
  });
}

/* ---------------- 复制代码 / 链接 ---------------- */
function flash(button: HTMLElement, text: string): void {
  const label = button.querySelector<HTMLElement>("[data-label]") ?? button;
  const original = label.dataset.original ?? label.textContent ?? "";
  label.dataset.original = original;
  label.textContent = text;
  window.setTimeout(() => {
    label.textContent = label.dataset.original ?? original;
  }, 1600);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function initCopy(): void {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const codeBtn = target.closest<HTMLElement>("[data-copy]");
    if (codeBtn) {
      const block = codeBtn.closest(".code-block");
      const code = block?.querySelector("pre code");
      if (!code) return;
      if (await copyText(code.textContent ?? "")) flash(codeBtn, s("copied"));
      return;
    }

    const linkBtn = target.closest<HTMLElement>("[data-copy-link]");
    if (linkBtn) {
      if (await copyText(window.location.href)) flash(linkBtn, s("copied"));
    }
  });
}

/* ---------------- 回到顶部 ---------------- */
function initBackToTop(): void {
  document.querySelectorAll<HTMLElement>("[data-to-top]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

export function initUI(): void {
  initTheme();
  initLocale();
  initHeader();
  initDrawer();
  initCopy();
  initBackToTop();
}
