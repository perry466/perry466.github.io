/**
 * 归档时间轴：竖线随阅读进度着色。
 *
 * 判定线放在视口 55% 处：线头大致跟住视线所在的位置，而不是跟着页面顶部走。
 * 没有 JS 时只是不填充强调色，内容、链接、锚点都照常可用。
 */
export function initArchive(): void {
  const timeline = document.querySelector<HTMLElement>("[data-timeline]");
  if (!timeline) return;

  const update = (): void => {
    const rect = timeline.getBoundingClientRect();
    const height = rect.height;
    if (height <= 0) return;
    const line = window.innerHeight * 0.55;
    const passed = Math.min(Math.max(line - rect.top, 0), height);
    // 只写一个 0–1 的比例，CSS 用 scaleY 拉伸，避免逐帧改 height 触发布局
    timeline.style.setProperty("--progress", String(passed / height));
  };

  // 直接算、不套 requestAnimationFrame：一次 rect 读取 + 一个 CSS 变量写入，
  // 浏览器的 scroll 事件本来就是一帧一次，套 rAF 反而在后台标签页里会丢帧
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
