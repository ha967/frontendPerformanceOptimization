/**
 * 生成本地演示图片，保证每次跑分条件一致，不依赖外网。
 *
 * 用法：
 *   node scripts/generate-images.mjs            生成缺失的图片并刷新 manifest
 *   node scripts/generate-images.mjs --ensure   仅补齐缺失文件，供 predev / prebuild 使用
 *   node scripts/generate-images.mjs --force    全部重新生成
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'src/demo/image-manifest.json');
const OUT_DIR = path.join(ROOT, 'public/images/generated');
const FULL_DIR = path.join(OUT_DIR, 'full');

const COUNT = 80;
const WIDTHS = [320, 640, 1280];
const FORMATS = [
  { ext: 'avif', encode: (pipeline) => pipeline.avif({ quality: 55, effort: 3 }) },
  { ext: 'webp', encode: (pipeline) => pipeline.webp({ quality: 72, effort: 4 }) },
  { ext: 'jpg', encode: (pipeline) => pipeline.jpeg({ quality: 80, mozjpeg: true }) },
];
const RATIOS = [
  { w: 3, h: 4 },
  { w: 4, h: 3 },
  { w: 1, h: 1 },
  { w: 3, h: 2 },
  { w: 2, h: 3 },
  { w: 4, h: 5 },
  { w: 16, h: 9 },
];
const CATEGORIES = ['风光', '城市', '建筑', '人文', '抽象', '静物'];
const PALETTES = [
  ['#0f172a', '#38bdf8'],
  ['#3b0764', '#f472b6'],
  ['#052e16', '#4ade80'],
  ['#431407', '#fb923c'],
  ['#1e1b4b', '#a78bfa'],
  ['#042f2e', '#2dd4bf'],
  ['#450a0a', '#f87171'],
  ['#1c1917', '#a8a29e'],
  ['#172554', '#60a5fa'],
  ['#3f2d0f', '#facc15'],
];

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const ensure = args.has('--ensure');

function buildManifest() {
  const baseWidth = 1600;
  const items = Array.from({ length: COUNT }, (_, index) => {
    const ratio = RATIOS[index % RATIOS.length];
    const category = CATEGORIES[index % CATEGORIES.length];
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `img-${number}`,
      title: `${category} · 作品 ${number}`,
      category,
      width: baseWidth,
      height: Math.round((baseWidth * ratio.h) / ratio.w),
    };
  });

  return {
    count: COUNT,
    widths: WIDTHS,
    formats: FORMATS.map((format) => format.ext),
    items,
  };
}

function buildSvg(item, index) {
  const [from, to] = PALETTES[(index * 7) % PALETTES.length];
  const { width: w, height: h } = item;
  const unit = Math.min(w, h);
  const cx1 = Math.round(w * (0.18 + ((index * 37) % 55) / 100));
  const cy1 = Math.round(h * (0.15 + ((index * 53) % 60) / 100));
  const cx2 = Math.round(w * (0.25 + ((index * 61) % 65) / 100));
  const cy2 = Math.round(h * (0.25 + ((index * 29) % 60) / 100));
  const number = String(index + 1).padStart(2, '0');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}" />
      <stop offset="1" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  <circle cx="${cx1}" cy="${cy1}" r="${unit * 0.4}" fill="#ffffff" fill-opacity="0.14" />
  <circle cx="${cx2}" cy="${cy2}" r="${unit * 0.26}" fill="#000000" fill-opacity="0.12" />
  <rect x="${w * 0.07}" y="${h * 0.07}" width="${w * 0.86}" height="${h * 0.86}"
    fill="none" stroke="#ffffff" stroke-opacity="0.24" stroke-width="${Math.max(2, Math.round(w * 0.006))}" />
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
    font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="${Math.round(w * 0.26)}"
    fill="#ffffff" fill-opacity="0.86">${number}</text>
</svg>`;
}

const expectedFiles = (manifest) => {
  const files = [];
  for (const item of manifest.items) {
    files.push(path.join(FULL_DIR, `${item.id}.jpg`));
    for (const width of WIDTHS) {
      for (const format of FORMATS) {
        files.push(path.join(OUT_DIR, `${item.id}-${width}.${format.ext}`));
      }
    }
  }
  return files;
};

async function writeManifest(manifest) {
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (ensure && existsSync(MANIFEST_PATH)) {
    return;
  }
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, json, 'utf8');
}

async function generateItem(item, index) {
  const svg = Buffer.from(buildSvg(item, index));
  const fullPath = path.join(FULL_DIR, `${item.id}.jpg`);

  if (force || !existsSync(fullPath)) {
    await sharp(svg).jpeg({ quality: 88, mozjpeg: true }).toFile(fullPath);
  }

  for (const width of WIDTHS) {
    const height = Math.round((width * item.height) / item.width);
    for (const format of FORMATS) {
      const file = path.join(OUT_DIR, `${item.id}-${width}.${format.ext}`);
      if (!force && existsSync(file)) {
        continue;
      }
      await format.encode(sharp(svg).resize(width, height, { fit: 'fill' })).toFile(file);
    }
  }
}

async function main() {
  const manifest = buildManifest();
  await writeManifest(manifest);
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(FULL_DIR, { recursive: true });

  const files = expectedFiles(manifest);
  const missing = files.filter((file) => !existsSync(file));

  if (missing.length === 0 && !force) {
    console.log(`[images] ready: ${files.length} files in ${path.relative(ROOT, OUT_DIR)}`);
    return;
  }

  console.log(
    `[images] generating ${manifest.count} items (${missing.length || files.length} missing files)...`,
  );
  const startedAt = performance.now();
  let cursor = 0;
  let finished = 0;

  async function worker() {
    while (cursor < manifest.items.length) {
      const index = cursor;
      cursor += 1;
      await generateItem(manifest.items[index], index);
      finished += 1;
      if (finished % 10 === 0 || finished === manifest.items.length) {
        console.log(`[images] ${finished}/${manifest.items.length} items`);
      }
    }
  }

  await Promise.all(Array.from({ length: 3 }, () => worker()));

  const generated = await readdir(FULL_DIR);
  let bytes = 0;
  for (const file of generated) {
    bytes += (await stat(path.join(FULL_DIR, file))).size;
  }
  const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[images] done in ${seconds}s (full-size JPEGs: ${(bytes / 1024 / 1024).toFixed(1)} MB)`,
  );
}

main().catch((error) => {
  console.error('[images] failed:', error);
  process.exitCode = 1;
});
