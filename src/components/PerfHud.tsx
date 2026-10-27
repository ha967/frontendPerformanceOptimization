import { useState } from 'react';
import {
  formatBytes,
  formatCls,
  formatMs,
  formatNumber,
  rateMetric,
  STATUS_LABEL,
} from '../metrics/format';
import type { MetricStatus } from '../metrics/format';
import { usePerformanceMetrics } from '../metrics/usePerformanceMetrics';
import './PerfHud.css';

const STATUS_CLASS: Record<MetricStatus, string> = {
  good: 'is-good',
  'needs-improvement': 'is-warn',
  poor: 'is-poor',
  unknown: 'is-unknown',
};

function StatTile({
  label,
  title,
  value,
  status,
  statusLabel,
}: {
  label: string;
  title: string;
  value: string;
  status: MetricStatus;
  statusLabel?: string;
}) {
  return (
    <div className={`perf-hud__tile ${STATUS_CLASS[status]}`}>
      <span className="perf-hud__tile-label" title={title}>
        {label}
      </span>
      <span className="perf-hud__tile-value">{value}</span>
      <span className="perf-hud__tile-status">
        <span className="perf-hud__dot" aria-hidden="true" />
        {statusLabel ?? STATUS_LABEL[status]}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="perf-hud__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function PerfHud() {
  const metrics = usePerformanceMetrics();
  const [open, setOpen] = useState(() => window.innerWidth > 640);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const lcpStatus = rateMetric('lcp', metrics.lcp);
  const clsStatus = rateMetric('cls', metrics.cls);
  const inpStatus = rateMetric('inp', metrics.inp);

  const copyLabel =
    copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败' : '复制指标';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metrics, null, 2));
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState('idle'), 1600);
  }

  return (
    <aside className="perf-hud" aria-label="实时性能指标">
      <header className="perf-hud__header">
        <span className="perf-hud__title">性能指标</span>
        {!open && (
          <span className="perf-hud__summary">
            LCP {formatMs(metrics.lcp)} · CLS {formatCls(metrics.cls)}
          </span>
        )}
        <button
          type="button"
          className="perf-hud__button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="perf-hud-body"
        >
          {open ? '收起' : '展开'}
        </button>
      </header>

      {open && (
        <div className="perf-hud__body" id="perf-hud-body">
          <div className="perf-hud__kpis">
            <StatTile
              label="LCP"
              title="Largest Contentful Paint：最大内容绘制"
              value={formatMs(metrics.lcp)}
              status={lcpStatus}
            />
            <StatTile
              label="CLS"
              title="Cumulative Layout Shift：累计布局位移"
              value={formatCls(metrics.cls)}
              status={clsStatus}
            />
            <StatTile
              label="INP"
              title="Interaction to Next Paint：交互到下一次绘制"
              value={metrics.inp === null ? '—' : formatMs(metrics.inp)}
              status={inpStatus}
              statusLabel={metrics.inp === null ? '等待交互' : undefined}
            />
          </div>

          <dl className="perf-hud__rows">
            <Row label="FCP" value={formatMs(metrics.fcp)} />
            <Row label="TTFB" value={formatMs(metrics.ttfb)} />
            <Row
              label="图片加载"
              value={`${formatNumber(metrics.imageRequests)} / ${formatNumber(metrics.imageElements)}`}
            />
            <Row label="图片传输" value={formatBytes(metrics.imageBytes)} />
            <Row label="资源传输" value={formatBytes(metrics.totalBytes)} />
            <Row
              label="长任务"
              value={
                metrics.longTaskSupported
                  ? `${formatNumber(metrics.longTaskCount)} 次 · ${formatMs(metrics.longTaskTime)}`
                  : '浏览器不支持'
              }
            />
            <Row
              label="滚动 FPS"
              value={
                metrics.scrollFps === null
                  ? '滚动后采样'
                  : `${metrics.scrollFps} fps · 最差帧 ${metrics.worstFrame ?? '—'} ms`
              }
            />
            <Row label="DOM 节点" value={formatNumber(metrics.domNodes)} />
            <Row label="卡片提交" value={`${formatNumber(metrics.cardCommits)} 次`} />
          </dl>

          {metrics.lcpElement && (
            <p className="perf-hud__lcp" title={metrics.lcpUrl ?? undefined}>
              <span>LCP 元素</span>
              <code>{metrics.lcpElement}</code>
            </p>
          )}

          <p className="perf-hud__note">
            手动对比请在 DevTools 勾选 Disable cache，并建议使用 Slow 4G + 4x CPU 降速。
            {import.meta.env.DEV && (
              <>
                {' '}
                开发模式会拉高指标，正式数据请使用 <code>npm run preview</code>。
              </>
            )}
          </p>

          <div className="perf-hud__actions">
            <button type="button" className="perf-hud__button" onClick={handleCopy}>
              {copyLabel}
            </button>
            <button
              type="button"
              className="perf-hud__button"
              onClick={() => window.location.reload()}
            >
              重新测量
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
