/**
 * 存储读写统一入口。
 *
 * 为什么需要包一层：Safari 隐私模式、禁用 Cookie、被嵌进沙箱 iframe 时，
 * `localStorage.getItem` 会直接抛异常。之前 `initUI()` 第一步就调它，
 * 一抛错整条初始化链（主题、语言、抽屉、复制、回顶）全部中断，页面看着正常但按钮全失灵。
 * 这里把异常吞掉并返回空值，让调用方用默认值继续跑。
 */
function store(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStore(key: string, legacyKey?: string): string | null {
  const storage = store("local");
  if (!storage) return null;
  try {
    return storage.getItem(key) ?? (legacyKey ? storage.getItem(legacyKey) : null);
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string): void {
  const storage = store("local");
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* 配额满或被禁用：偏好存不下就存不下，不影响当次交互 */
  }
}

export function readSession(key: string): string | null {
  const storage = store("session");
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): void {
  const storage = store("session");
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* 同上 */
  }
}
