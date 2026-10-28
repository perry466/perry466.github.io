/**
 * 生成分享图（Open Graph 卡片）。
 *
 * 为什么是"本地脚本 + 提交 PNG"而不是构建期生成：
 * - 构建期方案要额外依赖（satori / resvg）或让 CI 装中文字体，一旦字体缺失就是一堆方块；
 * - 这里借本机 Chrome 渲染 HTML，字体、换行、抗锯齿和真实浏览器一致；
 * - 生成物直接进 public/og/，构建零成本，图挂了也不会影响部署。
 *
 * 用法：
 *   pnpm og            # 生成默认图 + 所有文章的卡片
 *   pnpm og --only tech/static-site-search.md
 *
 * 产出的清单写入 src/data/og-manifest.ts，站点据此设置 og:image；
 * 某篇文章没有清单项（比如新写完还没跑脚本）会自动回退到默认分享图。
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const POSTS_DIR = join(ROOT, "src/content/posts");
const OUT_DIR = join(ROOT, "public/og");
const DEFAULT_OUT = join(ROOT, "public/images/og-default.png");
const MANIFEST = join(ROOT, "src/data/og-manifest.ts");
const TMP = join(ROOT, "node_modules/.cache/og");

const SITE_EN = "WHITESPACE";
const SITE_ZH = "留白";
const DOMAIN = "perry466.github.io";
const TAGLINE = "技术、项目与长期记录";

/* ---------------- 渲染 ---------------- */

const BASE_CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1200px; height:630px; }
  body {
    background:#fcfcfa; color:#1b1f24;
    font-family: Georgia, "Times New Roman", "Songti SC", SimSun, serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    position:relative; width:1200px; height:630px; padding:64px 72px;
    border:1px solid #e6e5df; display:flex; flex-direction:column; justify-content:space-between;
  }
  .mono { font-family: Consolas, "Courier New", monospace; letter-spacing:.14em; }
`;

const defaultCard = () => `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
h1 { font-size:200px; line-height:1; letter-spacing:.06em; font-weight:600; margin-top:8px; }
.top { font-size:21px; color:#6f7883; }
.rule { width:84px; height:3px; background:#9e3b2b; margin:34px 0 26px; }
.sub { font-size:34px; color:#39414a; letter-spacing:.04em; }
.foot { font-size:19px; color:#6f7883; padding-top:20px; border-top:1px solid #e6e5df; }
.art { position:absolute; right:64px; bottom:150px; width:330px; }
</style>
<div class="wrap">
  <div>
    <div class="top mono">${SITE_EN} &middot; ${DOMAIN}</div>
    <h1>${SITE_ZH}</h1>
    <div class="rule"></div>
    <div class="sub">${TAGLINE}</div>
  </div>
  <svg class="art" viewBox="0 0 330 190" fill="none">
    <path d="M4 182 L104 62 L150 118 L206 58 L326 182" stroke="#d9aaa0" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="292" cy="34" r="15" fill="#b06a5a"/>
  </svg>
  <div class="foot mono">Astro &middot; Pagefind &middot; GitHub Pages</div>
</div>`;

/** 中文按字数、英文按词数估长度，决定标题字号 */
function titleSize(text) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latin = text.replace(/[\u3400-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const weight = cjk + latin * 2.2;
  if (weight <= 12) return 84;
  if (weight <= 20) return 70;
  if (weight <= 30) return 58;
  if (weight <= 42) return 50;
  return 44;
}

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const postCard = ({ title, date, category }) => `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
.head { display:flex; justify-content:space-between; align-items:baseline; font-size:20px; color:#6f7883; }
h1 { font-size:${titleSize(title)}px; line-height:1.34; font-weight:600; letter-spacing:.01em; max-width:980px; }
.foot { display:flex; justify-content:space-between; align-items:center; padding-top:22px; border-top:1px solid #e6e5df; font-size:20px; color:#6f7883; }
.cat { color:#9e3b2b; letter-spacing:.08em; }
.dot { display:inline-block; width:9px; height:9px; border-radius:50%; background:#9e3b2b; margin-right:10px; vertical-align:2px; }
</style>
<div class="wrap">
  <div class="head mono"><span>${SITE_EN}</span><span>${date}</span></div>
  <h1>${escapeHtml(title)}</h1>
  <div class="foot mono"><span class="cat"><i class="dot"></i>${escapeHtml(category)}</span><span>${DOMAIN}</span></div>
</div>`;

/* ---------------- 浏览器截图 ---------------- */

function findChrome() {
  const candidates = [
    process.env.OG_CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const hit = candidates.find((path) => existsSync(path));
  if (!hit) throw new Error("找不到 Chrome，可用 OG_CHROME 环境变量指定可执行文件路径");
  return hit;
}

function render(chrome, html, outFile, name) {
  const htmlFile = join(TMP, `${name}.html`);
  writeFileSync(htmlFile, html, "utf8");
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      `--user-data-dir=${join(TMP, "profile")}`,
      `--screenshot=${outFile}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: "ignore", timeout: 60_000 },
  );
  if (result.status !== 0) throw new Error(`渲染失败：${name}`);
}

/* ---------------- 读取文章 ---------------- */

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith(".md") && !entry.name.startsWith("_") ? [path] : [];
  });
}

/** 只解析卡片用得到的几个字段，够用即可，不引入 YAML 依赖 */
function readFrontMatter(file) {
  const raw = readFileSync(file, "utf8");
  const end = raw.indexOf("\n---", 3);
  const head = end === -1 ? "" : raw.slice(0, end);
  const pick = (key) => {
    const match = head.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return {
    title: pick("title"),
    category: pick("category") || "uncategorized",
    slug: pick("slug"),
    pubDate: pick("pubDate"),
    draft: pick("draft") === "true",
  };
}

/** 发布日期：front matter 优先，其次 git 首次提交，最后文件修改时间 */
function resolveDate(file, pubDate) {
  if (pubDate) return pubDate.slice(0, 10);
  try {
    const out = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--format=%cI", "--", relative(ROOT, file)],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    if (out) return out.split("\n").pop().slice(0, 10);
  } catch {
    /* git 不可用时退回文件时间 */
  }
  return new Date(statSync(file).mtime).toISOString().slice(0, 10);
}

/** 与站点一致的 slug 归一化：小写、空格转连字符、去掉标点 */
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** 分类中文名：从 site.config.ts 的 categories 表里取，避免卡片上出现 tech 这种 slug */
function readCategories() {
  const cfg = readFileSync(join(ROOT, "src/site.config.ts"), "utf8");
  const start = cfg.indexOf("categories: [");
  const end = cfg.indexOf("] as CategoryItem");
  const block = start === -1 ? "" : cfg.slice(start, end === -1 ? undefined : end);
  const map = new Map();
  const pattern = /slug:\s*"([^"]+)"[\s\S]*?label:\s*"([^"]+)"/g;
  for (const match of block.matchAll(pattern)) {
    map.set(match[1], match[2]);
  }
  return map;
}

/** 文件名：纯 ASCII 的 slug 直接用，含中文等字符时用短哈希，避免 URL 里出现一长串转义 */
function imageName(slug, used) {
  const base = slug.split("/").pop() ?? slug;
  const hash = `p-${createHash("sha1").update(slug).digest("hex").slice(0, 8)}`;
  const safe = /^[a-z0-9-]+$/.test(base) && !used.has(base) ? base : hash;
  used.add(safe);
  return safe;
}

/* ---------------- 主流程 ---------------- */

const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : null;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(dirname(MANIFEST), { recursive: true });

const chrome = findChrome();
const categories = readCategories();
const posts = walk(POSTS_DIR)
  .map((file) => {
    const id = relative(POSTS_DIR, file).split("\\").join("/");
    const data = readFrontMatter(file);
    const rawPath = id.replace(/\.md$/, "");
    const slug = data.slug || rawPath.split("/").map(slugify).join("/");
    return { ...data, id, file, slug, date: resolveDate(file, data.pubDate) };
  })
  .filter((post) => !post.draft)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

if (!only) {
  render(chrome, defaultCard(), DEFAULT_OUT, "default");
  console.log("默认图 → public/images/og-default.png");
}

/** --only 时先读回已有清单，避免只生成一篇就把其余条目清空 */
function readExistingManifest() {
  if (!existsSync(MANIFEST)) return {};
  const raw = readFileSync(MANIFEST, "utf8");
  const map = {};
  for (const match of raw.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) map[match[1]] = match[2];
  return map;
}

const manifest = only ? readExistingManifest() : {};
const used = new Set();
for (const post of posts) {
  if (only && post.id !== only && post.slug !== only) continue;
  const name = imageName(post.slug, used);
  const out = join(OUT_DIR, `${name}.png`);
  render(
    chrome,
    postCard({ title: post.title, date: post.date, category: categories.get(post.category) ?? post.category }),
    out,
    `post-${name}`,
  );
  manifest[post.slug] = `/og/${name}.png`;
  console.log(`文章图 → public/og/${name}.png  (${post.title})`);
}

const lines = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, path]) => `  ${JSON.stringify(id)}: ${JSON.stringify(path)},`);

writeFileSync(
  MANIFEST,
  `/**\n * 由 scripts/og.mjs（pnpm og）生成，请勿手改。\n * 键是文章的 slug（= 文章 URL 的路径段），值是 public 下的分享图路径。\n */\nexport const ogManifest: Record<string, string> = {\n${lines.join("\n")}\n};\n`,
  "utf8",
);

console.log(`\n共 ${Object.keys(manifest).length} 张，清单 → src/data/og-manifest.ts`);
