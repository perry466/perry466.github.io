/**
 * remark 阶段记录代码块的围栏 meta（文件名、行号开关）。
 * 说明见 code-meta-registry.ts：这是 Astro 7 下唯一可靠的读取点。
 */
import { parseFenceMeta, rememberCodeMeta } from "./code-meta-registry";

interface MdastNode {
  type: string;
  value?: string;
  meta?: string | null;
  children?: MdastNode[];
}

export default function remarkCodeMeta() {
  return (tree: MdastNode): void => {
    const walk = (node: MdastNode): void => {
      if (node.type === "code") {
        const meta = (node.meta ?? "").trim();
        if (meta !== "" && typeof node.value === "string") {
          rememberCodeMeta(node.value, parseFenceMeta(meta));
        }
        return;
      }
      node.children?.forEach(walk);
    };

    walk(tree);
  };
}
