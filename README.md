# 前端性能优化实验

一个可复现的前端性能实验室：同一个图片瀑布流页面，按累积步骤逐步叠加优化手段，用页面内的实时 HUD 观察每一步的真实指标变化，并用自动化跑分生成可对比的结果页。

当前进度：**Phase 1 · 图片优化** + **Phase 2 · 自动跑分与对比页**

## 当前步骤（累积式）

| #   | 步骤       | 做了什么                                                         | 主要变化                                       |
| --- | ---------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 0   | 基线       | 80 张 1600px JPEG 全量加载，无尺寸占位                           | 图片约 4 MB，CLS 差，LCP 慢                    |
| 1   | 图片懒加载 | 每列首图 `eager` + `fetchpriority="high"`，其余 `loading="lazy"` | 无尺寸占位时懒加载基本失效，主要改善首屏优先级 |
| 2   | 固定宽高比 | `aspect-ratio` 预留空间 + 骨架屏                                 | CLS 接近 0，视口外图片才真正被推迟             |
| 3   | 响应式图片 | `picture` + `srcset` + `sizes`，AVIF / WebP / JPEG               | 图片传输大幅下降，LCP 改善                     |

## 快速开始

```bash
npm install
npm run images   # 首次生成 80 张图 × 10 个变体，约 14s、12 MB（已 gitignore）
npm run dev
```

`predev` / `prebuild` 会自动检查并补齐缺失图片。

正式测量请使用生产构建：

```bash
npm run build
npm run preview
```

## 页面

- `/`：项目介绍与步骤导航
- `/step/0` ~ `/step/3`：演示页 + 实时性能 HUD
- `/results`：自动跑分对比（KPI、柱状图、完整指标表）

## HUD 指标

- **Core Web Vitals**：LCP、CLS、INP、FCP、TTFB（web-vitals 实时上报）
- **图片**：已加载图片数 / DOM 图片数、图片传输字节
- **资源**：资源总传输字节
- **长任务**：次数与总时长
- **滚动 FPS**：滚动时采样 1 秒，显示平均 FPS 与最差帧
- **页面规模**：DOM 节点数、卡片提交次数
- **LCP 元素**：命中的元素与实际请求到的图片文件名

手动对比时在 DevTools 勾选 **Disable cache**，建议使用 **Slow 4G + 4x CPU** 降速。演示图片统一在首帧绘制后约 300ms 再写入 `src`，用于稳定复现基线 CLS；所有步骤使用相同的挂载时机，差异只来自图片属性与格式。

## 自动跑分（Phase 2）

```bash
npm run benchmark
```

`prebenchmark` 会先构建生产产物，然后由 `scripts/benchmark.mjs`：

- 自动在 `127.0.0.1:4174` 启动生产预览服务
- 使用本机 **Chrome**（playwright-core，`channel: 'chrome'`）打开每个步骤
- 每次运行使用全新浏览器上下文、禁用缓存、`1440×900 @1x`
- 默认 **Slow 4G + 4x CPU**，每个步骤跑 **3 次取中位数**
- 等待首屏图片加载稳定后读取指标（不滚动，避免懒加载把整页图片都拉下来）
- 点击一次分类筛选测量 INP；图片和 CLS 指标使用点击前的快照
- 结果写入 `public/benchmarks/results.json`（已 gitignore），并同步到 `dist/`

可用环境变量：

| 变量           | 默认值   | 说明                                       |
| -------------- | -------- | ------------------------------------------ |
| `PERF_RUNS`    | `3`      | 每个步骤的运行次数                         |
| `PERF_NETWORK` | `slow4g` | `slow4g` / `slow3g` / `fast`               |
| `PERF_CHANNEL` | `chrome` | `chrome` / `msedge` / 浏览器可执行文件路径 |
| `PERF_PORT`    | `4174`   | 跑分用的预览端口                           |

快速试跑：`PERF_RUNS=1 PERF_NETWORK=fast npm run benchmark`。已有 `dist` 时也可以用 `node scripts/benchmark.mjs` 跳过构建。

跑分完成后打开 `/results`。结果只适合同机相对比较；换机器、浏览器版本或限速档位后请重新跑分。

## 测量范围与口径

- HUD 用于手动观察，开发模式下数字会偏高，正式对比请使用生产构建。
- 自动跑分测量的是**首屏**：不滚动，图片指标取首屏加载稳定后的数值；INP 来自一次分类筛选点击。
- 每个步骤通过整页刷新切换，避免 SPA 状态和图片缓存污染指标。
- 自动跑分的每步中位数与每次运行的原始数据都保存在结果 JSON 中。

## 实现说明

- **瀑布流使用 flex 列容器**（按预估高度分配到最短列），而不是 CSS `column-count`。Chrome 的 LayoutShift API 不会上报多列布局内部的位移，用 `column-count` 会导致 CLS 始终为 0。
- **不使用 StrictMode**：开发环境的双渲染会干扰提交计数与指标观测。
- **卡片提交次数**用小 effect 计数。生产构建下 React `<Profiler>` 会被禁用，不能用来做该指标。
- **演示图片**由 sharp 在本地生成（渐变 + 编号），结果确定且不依赖外网；生成产物不入库。
- **自动跑分指标桥**：`usePerformanceMetrics` 会把最新快照写到 `window.__perf`，Playwright 直接读取结构化数据，不解析 DOM 文本。
- **跑分图表**是手写的 HTML/CSS 柱状图，不引入图表库；每根柱子的数值、悬停详情和完整表格共同承载可读性。

## 脚本

| 命令                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | 启动开发服务器（启动前检查演示图片） |
| `npm run images`       | 生成缺失的演示图片并刷新 manifest    |
| `npm run build`        | 类型检查并构建生产产物               |
| `npm run preview`      | 预览生产构建                         |
| `npm run benchmark`    | 构建并跑完整基准                     |
| `npm run lint`         | Oxlint + Prettier 检查               |
| `npm run format`       | Prettier 格式化                      |
| `npm run format:check` | 只检查格式                           |

## 目录结构

```text
scripts/
  generate-images.mjs       # 演示图片生成器
  benchmark.mjs             # Phase 2 自动跑分
src/
  benchmark/
    types.ts                # 跑分结果类型
  components/
    BarChart.tsx/.css       # 结果页柱状图
    PerfHud.tsx/.css        # 实时性能 HUD
    StepNav.tsx/.css        # 步骤导航
  demo/
    FeedCard.tsx            # 单张卡片（按步骤切换图片写法）
    FilterBar.tsx           # 分类筛选 / 倒序交互
    ImageFeed.tsx/.css      # flex 列瀑布流
    images.ts               # manifest 读取与 URL 构造
    steps.ts                # 累积步骤与开关
    image-manifest.json     # 图片尺寸/标题清单
  metrics/
    usePerformanceMetrics.ts  # CWV、资源、长任务、FPS 采集 + window.__perf
    renderStats.ts            # 卡片提交计数
    format.ts                 # 指标格式化与阈值
  pages/
    HomePage.tsx/.css
    DemoPage.tsx/.css
    ResultsPage.tsx/.css      # 自动跑分对比
  App.tsx
  main.tsx
  index.css
```

## 后续阶段

- **Phase 3**：虚拟化、渲染优化、代码分割、缓存策略等更多累积步骤，并在结果页加入长期趋势与回归检查。
