/**
 * 构建期正文增强（无第三方依赖，直接操作 hast）。
 *
 * 1. 代码块：包一层带文件名、语言与复制按钮的外壳；支持 ```ts title="a.ts" lineNumbers。
 * 2. 表格：包一层横向滚动容器，避免正文被撑破。
 * 3. 提示框：`> [!NOTE]` 这类引用转换为带样式的 callout，标题按中英文双份输出。
 * 4. 图片：补 loading/decoding 与灯箱标记。
 * 5. 外链：补 target 与 rel。
 *
 * 全部在构建时完成，浏览器端只负责按钮交互。
 */
import { recallCodeMeta, type CodeBlockMeta } from "./code-meta-registry";

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
  data?: Record<string, unknown>;
}

const CALLOUT_LABELS: Record<string, { zh: string; en: string }> = {
  note: { zh: "说明", en: "Note" },
  tip: { zh: "提示", en: "Tip" },
  important: { zh: "要点", en: "Important" },
  warning: { zh: "注意", en: "Warning" },
  caution: { zh: "警告", en: "Caution" },
};

const CALLOUT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

function prop(node: HastNode | undefined, ...names: string[]): string {
  if (!node?.properties) return "";
  for (const name of names) {
    const value = node.properties[name];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

/** 代码语言：Astro 7 输出 dataLanguage，旧版本为 data-language，兜底读 class */
function readLanguage(pre: HastNode, code: HastNode | undefined): string {
  const direct = prop(pre, "dataLanguage", "data-language");
  if (direct) return direct;
  const className = code?.properties?.class;
  const classes = Array.isArray(className) ? className.join(" ") : String(className ?? "");
  return classes.match(/language-([\w-]+)/)?.[1] ?? "";
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map(textOf).join("");
}

function isIgnorable(node: HastNode): boolean {
  return node.type === "text" && (node.value ?? "").trim() === "";
}

function el(
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode {
  return { type: "element", tagName, properties, children };
}

function text(value: string): HastNode {
  return { type: "text", value };
}

/** 代码块外壳；文件名与行号从构建期注册表按内容匹配取得 */
function buildCodeBlock(pre: HastNode): HastNode {
  const code = pre.children?.find((child) => child.tagName === "code");
  const lang = readLanguage(pre, code);
  const meta: CodeBlockMeta | undefined = code ? recallCodeMeta(textOf(code)) : undefined;

  if (meta?.lineNumbers) {
    pre.properties = {
      ...pre.properties,
      class: `${String(pre.properties?.class ?? "")} has-line-numbers`.trim(),
    };
  }

  const head = el("div", { class: "code-block__head" }, [
    el("span", { class: "code-block__title" }, [text(meta?.title ?? "")]),
    lang ? el("span", { class: "code-block__lang" }, [text(lang)]) : el("span", {}),
    el(
      "button",
      {
        type: "button",
        class: "code-copy",
        "data-copy": "",
        "aria-label": "复制代码 / Copy code",
      },
      [
        el("span", { class: "t-zh" }, [text("复制")]),
        el("span", { class: "t-en" }, [text("Copy")]),
      ],
    ),
  ]);

  return el("figure", { class: "code-block", "data-code-block": "" }, [head, pre]);
}

/** 引用转提示框：`> [!NOTE]` 起头的 blockquote */
function buildCallout(blockquote: HastNode): HastNode | null {
  const nodes = blockquote.children ?? [];
  // hast 里 blockquote 的第一个子节点常常是换行文本，需要跳过
  const firstIndex = nodes.findIndex((node) => !isIgnorable(node));
  if (firstIndex === -1) return null;

  const first = nodes[firstIndex];
  if (!first || first.tagName !== "p") return null;

  const raw = textOf(first).replace(/^\s+/, "");
  const match = raw.match(CALLOUT_MARKER);
  if (!match) return null;

  const type = (match[1] ?? "note").toLowerCase();
  const labels = CALLOUT_LABELS[type] ?? CALLOUT_LABELS["note"]!;

  // 从首段中删掉 [!TYPE] 标记
  let remaining = match[0].length;
  const strip = (children: HastNode[]): void => {
    for (const child of children) {
      if (remaining <= 0) return;
      if (child.type === "text") {
        const value = child.value ?? "";
        const cut = Math.min(remaining, value.length);
        child.value = value.slice(cut);
        remaining -= cut;
      } else if (child.children) {
        strip(child.children);
      }
    }
  };
  strip(first.children ?? []);

  if (first.children) {
    first.children = first.children.filter(
      (child) => !(child.type === "text" && (child.value ?? "").trim() === ""),
    );
  }

  const body = nodes.slice(firstIndex);
  if (first.children && first.children.length === 0) body.shift();

  return el("aside", { class: `callout callout--${type}` }, [
    el("p", { class: "callout__title" }, [
      el("span", { class: "t-zh" }, [text(labels.zh)]),
      el("span", { class: "t-en" }, [text(labels.en)]),
    ]),
    ...body,
  ]);
}

function upgradeImages(node: HastNode): void {
  if (node.tagName !== "img" || !node.properties) return;
  if (!node.properties["loading"]) node.properties["loading"] = "lazy";
  if (!node.properties["decoding"]) node.properties["decoding"] = "async";
  node.properties["data-zoomable"] = "";
}

function upgradeLinks(node: HastNode): void {
  if (node.tagName !== "a" || !node.properties) return;
  const href = String(node.properties["href"] ?? "");
  if (!/^https?:\/\//.test(href)) return;
  node.properties["target"] = "_blank";
  node.properties["rel"] = "noopener noreferrer";
}

/** 替换型处理：返回该节点在父级中的新形态（可能被包裹） */
function upgrade(node: HastNode): HastNode[] {
  if (node.type !== "element") {
    if (node.children) processChildren(node);
    return [node];
  }

  if (node.children) processChildren(node);

  if (node.tagName === "pre") return [buildCodeBlock(node)];
  if (node.tagName === "table") return [el("div", { class: "table-wrap" }, [node])];
  if (node.tagName === "blockquote") {
    const callout = buildCallout(node);
    if (callout) return [callout];
  }

  upgradeImages(node);
  upgradeLinks(node);
  return [node];
}

function processChildren(parent: HastNode): void {
  if (!parent.children) return;
  const next: HastNode[] = [];
  for (const child of parent.children) {
    next.push(...upgrade(child));
  }
  parent.children = next;
}

export default function rehypeEnhance() {
  // 放宽为 any：Astro 传进来的是 hast Root，与本地精简结构一致但类型定义不同，
  // 不必为此引入额外的 hast 类型依赖。
  return (tree: any): void => {
    processChildren(tree as HastNode);
  };
}
