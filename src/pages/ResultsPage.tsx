import { useEffect, useState } from 'react';
import type { BenchmarkResults, BenchmarkStep } from '../benchmark/types';
import { BarChart } from '../components/BarChart';
import type { ChartDatum } from '../components/BarChart';
import { STEPS } from '../demo/steps';
import {
  formatBytes,
  formatCls,
  formatMs,
  formatNumber,
  rateMetric,
  STATUS_LABEL,
} from '../metrics/format';
import type { MetricStatus } from '../metrics/format';
import type { PerformanceSnapshot } from '../metrics/usePerformanceMetrics';
import './ResultsPage.css';

const RESULTS_URL = '/benchmarks/results.json';

type LoadState =
  { status: 'loading' } | { status: 'missing' } | { status: 'ready'; data: BenchmarkResults };

const STATUS_CLASS: Record<MetricStatus, string> = {
  good: 'is-good',
  'needs-improvement': 'is-warn',
  poor: 'is-poor',
  unknown: 'is-unknown',
};

function stepShortLabel(step: BenchmarkStep): string {
  const meta = STEPS.find((item) => item.index === step.index);
  return `${step.index} ${meta?.shortTitle ?? step.title}`;
}

function percentDelta(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) {
    return null;
  }
  return ((value - baseline) / baseline) * 100;
}

function deltaLabel(delta: number | null): string {
  if (delta === null) {
    return '—';
  }
  const arrow = delta <= 0 ? '↓' : '↑';
  return `${arrow} ${Math.abs(delta).toFixed(1)}%`;
}

function StatCard({
  label,
  hint,
  value,
  delta,
}: {
  label: string;
  hint: string;
  value: string;
  delta: number | null;
}) {
  const better = delta !== null && delta < 0;
  const worse = delta !== null && delta > 0;

  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__hint">{hint}</span>
      <span className={`stat-card__delta ${better ? 'is-better' : ''} ${worse ? 'is-worse' : ''}`}>
        {delta === null ? (
          '—'
        ) : (
          <>
            {deltaLabel(delta)} <span>vs 基线</span>
          </>
        )}
      </span>
    </div>
  );
}

function StatusChip({ status }: { status: MetricStatus }) {
  if (status === 'unknown') {
    return null;
  }
  return (
    <span className={`results-status ${STATUS_CLASS[status]}`}>
      <span className="results-status__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

interface TableRow {
  label: string;
  format: (metrics: PerformanceSnapshot) => string;
  status?: (metrics: PerformanceSnapshot) => MetricStatus;
}

const TABLE_ROWS: TableRow[] = [
  { label: 'LCP', format: (m) => formatMs(m.lcp), status: (m) => rateMetric('lcp', m.lcp) },
  { label: 'CLS', format: (m) => formatCls(m.cls), status: (m) => rateMetric('cls', m.cls) },
  { label: 'INP', format: (m) => formatMs(m.inp), status: (m) => rateMetric('inp', m.inp) },
  { label: 'FCP', format: (m) => formatMs(m.fcp) },
  { label: 'TTFB', format: (m) => formatMs(m.ttfb) },
  {
    label: '首屏图片请求',
    format: (m) => `${formatNumber(m.imageRequests)} / ${formatNumber(m.imageElements)}`,
  },
  { label: '首屏图片传输', format: (m) => formatBytes(m.imageBytes) },
  { label: '资源总传输', format: (m) => formatBytes(m.totalBytes) },
  {
    label: '长任务',
    format: (m) =>
      m.longTaskSupported
        ? `${formatNumber(m.longTaskCount)} 次 · ${formatMs(m.longTaskTime)}`
        : '浏览器不支持',
  },
  { label: 'DOM 节点', format: (m) => formatNumber(m.domNodes) },
  { label: '初始卡片提交', format: (m) => `${formatNumber(m.cardCommits)} 次` },
];

interface ChartConfig {
  key: string;
  title: string;
  subtitle: string;
  data: ChartDatum[];
  format: (value: number | null) => string;
  threshold?: { value: number };
}

function chartData(
  steps: BenchmarkStep[],
  pick: (metrics: PerformanceSnapshot) => number | null,
  statusFor?: (metrics: PerformanceSnapshot) => MetricStatus,
): ChartDatum[] {
  return steps.map((step) => ({
    key: String(step.index),
    label: stepShortLabel(step),
    value: pick(step.median),
    status: statusFor?.(step.median),
  }));
}

function ResultsContent({ data }: { data: BenchmarkResults }) {
  const steps = [...data.steps].sort((a, b) => a.index - b.index);
  if (steps.length === 0) {
    return <p className="results__loading">跑分数据为空。</p>;
  }

  const baseline = steps[0];
  const final = steps[steps.length - 1];
  const environment = data.environment;

  const kpis = [
    {
      label: 'LCP',
      hint: '最大内容绘制',
      value: formatMs(final.median.lcp),
      delta: percentDelta(final.median.lcp, baseline.median.lcp),
    },
    {
      label: 'CLS',
      hint: '累计布局位移',
      value: formatCls(final.median.cls),
      delta: percentDelta(final.median.cls, baseline.median.cls),
    },
    {
      label: '首屏图片传输',
      hint: '点击前快照',
      value: formatBytes(final.median.imageBytes),
      delta: percentDelta(final.median.imageBytes, baseline.median.imageBytes),
    },
    {
      label: '首屏图片请求',
      hint: '点击前快照',
      value: formatNumber(final.median.imageRequests),
      delta: percentDelta(final.median.imageRequests, baseline.median.imageRequests),
    },
  ];

  const charts: ChartConfig[] = [
    {
      key: 'lcp',
      title: 'LCP',
      subtitle: '最大内容绘制 · 越低越好 · 良好线 2.5 s',
      data: chartData(
        steps,
        (m) => m.lcp,
        (m) => rateMetric('lcp', m.lcp),
      ),
      format: formatMs,
      threshold: { value: 2500 },
    },
    {
      key: 'cls',
      title: 'CLS',
      subtitle: '累计布局位移 · 越低越好 · 良好线 0.10',
      data: chartData(
        steps,
        (m) => m.cls,
        (m) => rateMetric('cls', m.cls),
      ),
      format: formatCls,
      threshold: { value: 0.1 },
    },
    {
      key: 'bytes',
      title: '首屏图片传输',
      subtitle: '点击前快照 · 越低越好',
      data: chartData(steps, (m) => m.imageBytes),
      format: formatBytes,
    },
    {
      key: 'requests',
      title: '首屏图片请求',
      subtitle: '点击前快照 · 越低越好',
      data: chartData(steps, (m) => m.imageRequests),
      format: formatNumber,
    },
  ];

  return (
    <>
      <ul className="results__env" aria-label="跑分环境">
        <li>{environment.browser}</li>
        <li>{environment.network}</li>
        <li>CPU {environment.cpuThrottling}×</li>
        <li>{environment.viewport}</li>
        <li>{environment.runs} 次中位数</li>
      </ul>
      <p className="results__meta">
        生成于 {new Date(data.generatedAt).toLocaleString('zh-CN')} · {environment.scope}
      </p>

      <section className="results__kpis" aria-label="最终结果相对基线的变化">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            hint={kpi.hint}
            value={kpi.value}
            delta={kpi.delta}
          />
        ))}
      </section>

      <section className="results__charts" aria-label="各步骤指标对比">
        {charts.map((chart) => {
          const ariaLabel = `${chart.title}：${chart.data
            .map((item) => `${item.label} ${chart.format(item.value)}`)
            .join('，')}`;
          return (
            <BarChart
              key={chart.key}
              title={chart.title}
              subtitle={chart.subtitle}
              data={chart.data}
              format={chart.format}
              threshold={chart.threshold}
              ariaLabel={ariaLabel}
            />
          );
        })}
      </section>

      <section className="results__table-section" aria-labelledby="results-table-title">
        <h2 id="results-table-title">完整指标</h2>
        <div className="results-table-wrap">
          <table className="results-table">
            <caption>
              各步骤指标中位数，共 {environment.runs} 次运行；图片指标为点击筛选前的首屏快照。
            </caption>
            <thead>
              <tr>
                <th scope="col">指标</th>
                {steps.map((step) => (
                  <th key={step.index} scope="col">
                    {stepShortLabel(step)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {steps.map((step) => {
                    const status = row.status?.(step.median);
                    return (
                      <td key={step.index}>
                        {row.format(step.median)}
                        {status && <StatusChip status={status} />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="results__note">
        结果只适合同机相对比较。换机器、浏览器版本或限速档位后请重新跑分：
        <code>npm run benchmark</code>。
        <a href={RESULTS_URL} target="_blank" rel="noreferrer">
          查看原始 JSON
        </a>
      </p>
    </>
  );
}

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <section className="results-empty" aria-labelledby="results-empty-title">
      <h2 id="results-empty-title">还没有跑分数据</h2>
      <p>运行下面的命令生成结果：</p>
      <pre>
        <code>npm run benchmark</code>
      </pre>
      <p>
        脚本会先构建生产产物，然后用本机 Chrome 在 Slow 4G + 4x CPU 下依次测量 4 个步骤，每步 3
        次取中位数，约需 2–4 分钟。结果写入 <code>public/benchmarks/results.json</code>。 可以用{' '}
        <code>PERF_RUNS=1</code> 快速试跑。
      </p>
      <div className="results-empty__actions">
        <a className="results__button" href="/step/0">
          先看演示页
        </a>
        <button type="button" className="results__button results__button--ghost" onClick={onReload}>
          重新读取
        </button>
      </div>
    </section>
  );
}

export default function ResultsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => {
    setState({ status: 'loading' });
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    fetch(RESULTS_URL, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<BenchmarkResults>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
          setState({ status: 'missing' });
          return;
        }
        setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'missing' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <main className="results">
      <div className="results__topbar">
        <a className="results__brand" href="/">
          ← 性能实验室
        </a>
        <div className="results__topbar-actions">
          <a className="results__link" href="/step/0">
            演示页
          </a>
          <button type="button" className="results__button results__button--ghost" onClick={reload}>
            刷新结果
          </button>
        </div>
      </div>

      <header className="results__header">
        <p className="eyebrow">Phase 2 · Automated Benchmark</p>
        <h1>自动跑分对比</h1>
        <p className="results__lead">
          同一台机器、同一限速条件下，每个步骤都在全新的浏览器上下文中运行，取多次中位数。
          图表和表格全部来自真实生产构建。
        </p>
      </header>

      {state.status === 'loading' && <p className="results__loading">正在读取跑分结果…</p>}
      {state.status === 'missing' && <EmptyState onReload={reload} />}
      {state.status === 'ready' && <ResultsContent data={state.data} />}
    </main>
  );
}
