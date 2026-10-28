/**
 * Phase 2 自动跑分。
 *
 * 每个步骤使用全新的浏览器上下文，禁用缓存，在固定网络 / CPU 限速下测量首屏：
 * - 等待首屏资源 network idle 后读取指标（不滚动，避免懒加载把整页图片都拉下来）
 * - 点击一次分类筛选，读取 INP；图片 / 布局指标仍使用点击前的快照
 * - 每个步骤运行多次取中位数，结果写入 public/benchmarks/results.json
 *
 * 用法：
 *   npm run benchmark
 *   PERF_RUNS=1 PERF_NETWORK=fast npm run benchmark
 *   node scripts/benchmark.mjs            # 复用现有 dist，不重新构建
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC_RESULTS = path.join(ROOT, 'public/benchmarks/results.json');
const DIST_RESULTS = path.join(DIST, 'benchmarks/results.json');

const PORT = Number(process.env.PERF_PORT ?? 4174);
const RUNS = Math.max(1, Number(process.env.PERF_RUNS ?? 3));
const VIEWPORT = { width: 1440, height: 900 };
const FILTER_LABEL = '风光';
const STEP_INDICES = [0, 1, 2, 3];

const NETWORK_PROFILES = {
  slow4g: {
    label: 'Slow 4G',
    latency: 150,
    downloadMbps: 1.6,
    uploadMbps: 0.75,
    cpu: 4,
    connectionType: 'cellular4g',
  },
  slow3g: {
    label: 'Slow 3G',
    latency: 400,
    downloadMbps: 0.4,
    uploadMbps: 0.4,
    cpu: 6,
    connectionType: 'cellular3g',
  },
  fast: {
    label: 'Fast（不限速）',
    latency: 0,
    downloadMbps: null,
    uploadMbps: null,
    cpu: 1,
    connectionType: 'wifi',
  },
};

const profileKey = process.env.PERF_NETWORK ?? 'slow4g';
const profile = NETWORK_PROFILES[profileKey];
if (!profile) {
  console.error(
    `[benchmark] 未知网络档位 "${profileKey}"，可选：${Object.keys(NETWORK_PROFILES).join(', ')}`,
  );
  process.exit(1);
}

const NUMERIC_KEYS = [
  'lcp',
  'cls',
  'fcp',
  'ttfb',
  'inp',
  'imageRequests',
  'imageBytes',
  'totalRequests',
  'totalBytes',
  'longTaskCount',
  'longTaskTime',
  'scrollFps',
  'worstFrame',
  'domNodes',
  'imageElements',
  'cardCommits',
];

function fmtMs(value) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function fmtBytes(value) {
  if (value == null) {
    return '—';
  }
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(2)} MB`
    : `${(value / 1024).toFixed(1)} KB`;
}

function median(values) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (numbers.length === 0) {
    return null;
  }
  numbers.sort((a, b) => a - b);
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 1 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
}

function medianSnapshot(runs) {
  const snapshot = {};
  for (const key of NUMERIC_KEYS) {
    snapshot[key] = median(runs.map((run) => run[key]));
  }
  snapshot.longTaskSupported = runs[0]?.longTaskSupported ?? false;
  snapshot.lcpElement = runs.find((run) => run.lcpElement)?.lcpElement ?? null;
  snapshot.lcpUrl = runs.find((run) => run.lcpUrl)?.lcpUrl ?? null;
  return snapshot;
}

function launchOptions() {
  const requested = process.env.PERF_CHANNEL ?? 'chrome';
  if (requested === 'chromium') {
    return { headless: true };
  }
  if (requested === 'chrome' || requested === 'msedge') {
    return { headless: true, channel: requested };
  }
  return { headless: true, executablePath: requested };
}

function browserLabel() {
  const requested = process.env.PERF_CHANNEL ?? 'chrome';
  if (requested === 'msedge') {
    return 'Edge';
  }
  if (requested === 'chrome') {
    return 'Chrome';
  }
  return 'Chromium';
}

async function applyThrottling(cdp) {
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  if (profile.cpu > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  }

  if (profile.downloadMbps != null) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: (profile.downloadMbps * 1024 * 1024) / 8,
      uploadThroughput: ((profile.uploadMbps ?? profile.downloadMbps) * 1024 * 1024) / 8,
      connectionType: profile.connectionType,
    });
  }
}

async function waitForInitialImages(page, stepIndex) {
  const timeoutMs = 90_000;
  const quietMs = 3_000;
  const startedAt = Date.now();
  let previousComplete = -1;
  let stableSince = Date.now();
  let last = { complete: 0, total: 0 };

  while (Date.now() - startedAt < timeoutMs) {
    last = await page.evaluate(() => ({
      total: document.images.length,
      complete: Array.from(document.images).filter((img) => img.complete).length,
    }));

    if (last.total > 0 && last.complete === last.total) {
      return last;
    }

    if (last.complete !== previousComplete) {
      previousComplete = last.complete;
      stableSince = Date.now();
    } else if (last.complete > 0 && Date.now() - stableSince >= quietMs) {
      console.log(`  step ${stepIndex} 首屏图片稳定在 ${last.complete}/${last.total}`);
      return last;
    }

    await page.waitForTimeout(200);
  }

  console.warn(`[benchmark] step ${stepIndex} 等待首屏图片超时（${last.complete}/${last.total}）`);
  return last;
}

async function measureStep(browser, baseUrl, stepIndex) {
  const runs = [];
  let title = '';
  let summary = '';

  for (let run = 1; run <= RUNS; run += 1) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });

    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await applyThrottling(cdp);

      await page.goto(`${baseUrl}/step/${stepIndex}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });

      if (!title) {
        title = (await page.locator('h1').innerText()).trim();
        summary = (await page.locator('.demo-header__summary').innerText()).trim();
      }

      await page.waitForFunction(() => window.__perf && window.__perf.fcp !== null, undefined, {
        timeout: 30_000,
      });

      // 图片在首帧后约 300ms 挂载；等首屏图片完成数稳定，而不是等 networkidle
      // （后者可能在图片挂载前就已经满足）。
      await page.waitForTimeout(700);
      await waitForInitialImages(page, stepIndex);
      await page.waitForTimeout(1000);

      const initial = await page.evaluate(() => window.__perf);
      if (!initial) {
        throw new Error('页面没有暴露 window.__perf');
      }

      // 用一次真实点击测 INP；图片 / 布局指标仍取点击前快照。
      await page.getByRole('button', { name: FILTER_LABEL, exact: true }).click();
      await page.waitForTimeout(1000);
      const afterClick = await page.evaluate(() => window.__perf);

      const metrics = {
        ...initial,
        lcp: afterClick?.lcp ?? initial.lcp,
        inp: afterClick?.inp ?? null,
      };
      runs.push(metrics);

      console.log(
        `  step ${stepIndex} run ${run}/${RUNS}: ` +
          `LCP ${fmtMs(metrics.lcp)} · CLS ${(metrics.cls ?? 0).toFixed(3)} · ` +
          `图片 ${metrics.imageRequests}/${metrics.imageElements} · ${fmtBytes(metrics.imageBytes)} · ` +
          `INP ${fmtMs(metrics.inp)}`,
      );
    } finally {
      await context.close();
    }
  }

  return { title, summary, runs };
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error(
      '[benchmark] dist/index.html 不存在，请先运行 npm run build 或 npm run benchmark',
    );
    process.exitCode = 1;
    return;
  }

  const startedAt = Date.now();
  let server;
  let browser;

  try {
    server = await preview({
      root: ROOT,
      preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
      logLevel: 'warn',
    });

    browser = await chromium.launch(launchOptions());
    const baseUrl = `http://127.0.0.1:${PORT}`;

    console.log(
      `[benchmark] ${browserLabel()} ${browser.version()} · ${profile.label} · ` +
        `CPU ${profile.cpu}x · ${VIEWPORT.width}×${VIEWPORT.height} · ${RUNS} 次取中位数`,
    );
    console.log(`[benchmark] 服务地址 ${baseUrl}`);

    const steps = [];
    for (const stepIndex of STEP_INDICES) {
      const { title, summary, runs } = await measureStep(browser, baseUrl, stepIndex);
      steps.push({
        index: stepIndex,
        title,
        summary,
        median: medianSnapshot(runs),
        runs,
      });
    }

    const results = {
      generatedAt: new Date().toISOString(),
      environment: {
        browser: `${browserLabel()} ${browser.version()}`,
        viewport: `${VIEWPORT.width}×${VIEWPORT.height} @1x`,
        network: profile.label,
        cpuThrottling: profile.cpu,
        runs: RUNS,
        scope: '首屏（不滚动）；等待首屏图片加载稳定后读取；INP 来自一次分类筛选点击。',
      },
      steps,
    };

    const json = `${JSON.stringify(results, null, 2)}\n`;
    await mkdir(path.dirname(PUBLIC_RESULTS), { recursive: true });
    await mkdir(path.dirname(DIST_RESULTS), { recursive: true });
    await writeFile(PUBLIC_RESULTS, json, 'utf8');
    await writeFile(DIST_RESULTS, json, 'utf8');

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[benchmark] done in ${seconds}s`);
    console.log(`[benchmark] wrote ${path.relative(ROOT, PUBLIC_RESULTS)}`);
    console.log('[benchmark] 打开 /results 查看对比图表');
  } finally {
    await browser?.close();
    await server?.close();
  }
}

main().catch((error) => {
  console.error('[benchmark] failed:', error);
  process.exitCode = 1;
});
