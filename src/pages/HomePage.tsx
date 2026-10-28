import { STEPS } from '../demo/steps';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home">
      <header className="home__hero">
        <p className="eyebrow">Performance Lab · Phase 1–2</p>
        <h1>把性能优化，变成能看见的步骤</h1>
        <p className="home__lead">
          同一个瀑布流页面，从“全量高清图”开始，逐层叠加懒加载、固定宽高比、响应式图片。
          右下角的实时 HUD 会记录每一步的 Core Web Vitals、图片传输、长任务与滚动 FPS，
          让改进幅度有据可查。
        </p>
        <div className="home__actions">
          <a className="home__cta" href="/step/0">
            从基线开始 →
          </a>
          <a className="home__secondary" href="/results">
            查看自动跑分结果
          </a>
        </div>
      </header>

      <section className="home__section" aria-labelledby="steps-title">
        <h2 id="steps-title">四个累积步骤</h2>
        <ol className="step-list">
          {STEPS.map((step) => (
            <li key={step.index}>
              <a className="step-card" href={`/step/${step.index}`}>
                <span className="step-card__index">{String(step.index).padStart(2, '0')}</span>
                <span className="step-card__body">
                  <span className="step-card__title">{step.title}</span>
                  <span className="step-card__summary">{step.summary}</span>
                </span>
                <span className="step-card__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="home__note" aria-labelledby="measure-title">
        <h2 id="measure-title">怎么测才可信</h2>
        <p>
          正式对比请使用生产构建：<code>npm run build &amp;&amp; npm run preview</code>。 开发模式的
          HMR、未压缩代码和 React 开发构建都会让数字偏高。
        </p>
        <p>
          每个步骤通过整页刷新切换，避免 SPA 状态污染指标。手动对比时请在 DevTools 勾选 Disable
          cache，并建议把网络与 CPU 降速到 Slow 4G + 4x CPU；本机网速太快时， CLS 和 LCP
          的差异会不明显，而图片传输体积的差异始终可见。
        </p>
        <p>
          图片由 <code>npm run images</code> 在本地生成，不依赖外网；<code>dev</code> 和{' '}
          <code>build</code> 前会自动检查并补齐缺失文件。为了让 CLS
          稳定复现，演示图片统一在首帧绘制后约 300ms 再写入 <code>src</code>
          ；所有步骤的挂载时机一致，差异只来自图片本身。
        </p>
        <p>
          想得到可复现的自动对比，先运行 <code>npm run benchmark</code>，再打开{' '}
          <a href="/results">跑分结果页</a>。脚本会构建生产产物、自动启动 preview，并在 Slow 4G + 4x
          CPU 下按步骤测量。
        </p>
      </section>

      <p className="home__footnote">
        Phase 1 聚焦图片加载，Phase 2 补齐自动跑分与对比页。Phase 3
        将加入虚拟化、渲染优化与代码分割。
      </p>
    </div>
  );
}
