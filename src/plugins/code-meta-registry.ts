/**
 * 代码围栏的 meta 信息（```ts title="a.ts" lineNumbers）在 Astro 7 下无法通过
 * hast 属性传到 rehype 阶段：默认处理器会丢掉围栏 meta，shiki 也会丢弃
 * data.hProperties。这里改用一个构建期注册表按代码内容匹配。
 *
 * 之所以用「代码内容」作为键而不是顺序下标：内容与顺序无关，即使多个文档
 * 并行渲染也不会错位。
 */

export interface CodeBlockMeta {
  title: string;
  lineNumbers: boolean;
}

const TITLE = /(?:^|\s)title\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/;
const LINE_NUMBERS = /(?:^|\s)(line-?numbers?|showLineNumbers)(?=\s|$)/i;

const registry = new Map<string, CodeBlockMeta>();

/** 归一化代码内容：去掉行尾空白与首尾空行，只保留有意义的文本 */
export function codeKey(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function rememberCodeMeta(source: string, meta: CodeBlockMeta): void {
  registry.set(codeKey(source), meta);
}

export function recallCodeMeta(source: string): CodeBlockMeta | undefined {
  return registry.get(codeKey(source));
}

export function parseFenceMeta(meta: string): CodeBlockMeta {
  const titleMatch = meta.match(TITLE);
  return {
    title: (titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3] ?? "").trim(),
    lineNumbers: LINE_NUMBERS.test(meta),
  };
}
