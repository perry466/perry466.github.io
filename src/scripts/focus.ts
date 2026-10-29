/**
 * 弹层打开时把背景设成 `inert`。
 *
 * 目的：Tab 只能在弹层内循环，点击和读屏也穿透不到背后的页面。
 * 做法：从弹层根节点往上走，把「不属于当前分支」的兄弟节点逐个标记 `inert`，
 * 关闭时只撤销自己加过的那些——不碰原本就带 `inert` 的元素。
 *
 * 为什么不用手写 Tab 循环：`inert` 是浏览器语义，连点击和辅助技术一起屏蔽，
 * 也不需要维护「哪些元素可聚焦」的名单。环境不支持时直接跳过，行为退回现状。
 */
const supported =
  typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;

export function lockBackground(root: HTMLElement): () => void {
  if (!supported) return () => {};

  const touched: HTMLElement[] = [];
  let node: HTMLElement | null = root;

  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.hasAttribute("inert")) continue;
      sibling.setAttribute("inert", "");
      touched.push(sibling);
    }
    node = parent;
  }

  return () => {
    for (const element of touched) element.removeAttribute("inert");
    touched.length = 0;
  };
}
