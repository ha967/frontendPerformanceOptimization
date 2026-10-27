# 前端性能优化实验

一个可复现的前端性能实验室：同一个图片瀑布流页面，按累积步骤逐步叠加优化手段，用页面内的实时 HUD 观察每一步的真实指标变化。

当前进度：**Phase 1 · 图片优化**

## 当前步骤（累积式）

| #   | 步骤       | 做了什么                                                         | 主要变化                                       |
| --- | ---------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 0   | 基线       | 80 张 1600px JPEG 全量加载，无尺寸占位                           | 图片约 4 MB，CLS 差，LCP 慢                    |
| 1   | 图片懒加载 | 每列首图 `eager` + `fetchpriority="high"`，其余 `loading="lazy"` | 无尺寸占位时懒加载基本失效，主要验证首屏优先级 |
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

## HUD 指标

- **Core Web Vitals**：LCP、CLS、INP、FCP、TTFB（web-vitals 实时上报）
- **图片**：已加载图片数 / DOM 图片数、图片传输字节
- **资源**：资源总传输字节
- **长任务**：次数与总时长
- **滚动 FPS**：滚动时采样 1 秒，显示平均 FPS 与最差帧
- **页面规模**：DOM 节点数、卡片提交次数
- **LCP 元素**：命中的元素与实际请求到的图片文件名

## 测量建议

- 使用生产构建，开发模式的 HMR 和未压缩代码会显著拉高指标。
- 在 DevTools 中勾选 **Disable cache**，并建议使用 **Slow 4G + 4x CPU** 降速；本机网速太快时，CLS / LCP 的差异会变小，但图片传输字节的差异始终可见。
- 每个步骤通过整页刷新切换，保持相同的窗口大小、滚动深度和交互操作。
- 演示图片统一在首帧绘制后约 300ms 再写入 `src`，用于稳定复现基线 CLS；所有步骤使用相同的挂载时机，差异只来自图片属性与格式。

## 实现说明

- **瀑布流使用 flex 列容器**（按预估高度分配到最短列），而不是 CSS `column-count`。Chrome 的 LayoutShift API 不会上报多列布局内部的位移，用 `column-count` 会导致 CLS 始终为 0。
- **不使用 StrictMode**：开发环境的双渲染会干扰提交计数与指标观测。
- **卡片提交次数**用小 effect 计数。生产构建下 React `<Profiler>` 会被禁用，不能用来做该指标。
- **演示图片**由 sharp 在本地生成（渐变 + 编号），结果确定且不依赖外网；生成产物不入库。

## 脚本

| 命令              | 说明                                 |
| ----------------- | ------------------------------------ |
| `npm run dev`     | 启动开发服务器（启动前检查演示图片） |
| `npm run images`  | 生成缺失的演示图片并刷新 manifest    |
| `npm run build`   | 类型检查并构建生产产物               |
| `npm run preview` | 预览生产构建                         |
| `npm run lint`    | Oxlint 代码检查                      |

## 目录结构

```text
scripts/
  generate-images.mjs      # 演示图片生成器
src/
  components/
    PerfHud.tsx/.css       # 实时性能 HUD
    StepNav.tsx/.css       # 步骤导航
  demo/
    FeedCard.tsx           # 单张卡片（按步骤切换图片写法）
    FilterBar.tsx          # 分类筛选 / 倒序交互
    ImageFeed.tsx/.css     # flex 列瀑布流
    images.ts              # manifest 读取与 URL 构造
    steps.ts               # 累积步骤与开关
    image-manifest.json    # 图片尺寸/标题清单
  metrics/
    usePerformanceMetrics.ts  # CWV、资源、长任务、FPS 采集
    renderStats.ts            # 卡片提交计数
    format.ts                 # 指标格式化与阈值
  pages/
    HomePage.tsx/.css
    DemoPage.tsx/.css
  App.tsx
  main.tsx
  index.css
```

## 后续阶段

- **Phase 2**：Playwright 自动跑分（CDP 限速、多次取中位数）+ `/results` 各步骤对比图表。
- **Phase 3**：虚拟化、渲染优化、代码分割、缓存策略等更多累积步骤。
