import { useState } from 'react';
import { STATUS_LABEL } from '../metrics/format';
import type { MetricStatus } from '../metrics/format';
import './BarChart.css';

export interface ChartDatum {
  key: string;
  label: string;
  value: number | null;
  status?: MetricStatus;
}

interface BarChartProps {
  title: string;
  subtitle: string;
  data: ChartDatum[];
  format: (value: number | null) => string;
  threshold?: { value: number };
  ariaLabel: string;
}

const PLOT_HEIGHT = 150;
const TOP_PADDING = 20;

const STATUS_CLASS: Record<MetricStatus, string> = {
  good: 'is-good',
  'needs-improvement': 'is-warn',
  poor: 'is-poor',
  unknown: 'is-unknown',
};

export function BarChart({ title, subtitle, data, format, threshold, ariaLabel }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxValue = Math.max(1, ...data.map((item) => item.value ?? 0), threshold?.value ?? 0);
  const scaleMax = maxValue * 1.12;
  const barArea = PLOT_HEIGHT - TOP_PADDING;
  const baselineValue = data[0]?.value ?? null;
  const active = activeIndex === null ? null : data[activeIndex];

  function deltaText(value: number | null, index: number): string {
    if (index === 0) {
      return '基线';
    }
    if (value === null || baselineValue === null || baselineValue === 0) {
      return '—';
    }
    const delta = ((value - baselineValue) / baselineValue) * 100;
    const arrow = delta <= 0 ? '↓' : '↑';
    return `${arrow} ${Math.abs(delta).toFixed(1)}% vs 基线`;
  }

  return (
    <figure className="bar-chart">
      <figcaption className="bar-chart__caption">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </figcaption>

      <div
        className="bar-chart__plot"
        style={{ height: PLOT_HEIGHT }}
        role="group"
        aria-label={ariaLabel}
      >
        {threshold && (
          <div
            className="bar-chart__threshold"
            style={{ bottom: (threshold.value / scaleMax) * barArea }}
            aria-hidden="true"
          />
        )}
        {data.map((item, index) => {
          const barHeight =
            item.value === null ? 0 : Math.max(2, (item.value / scaleMax) * barArea);
          return (
            <div
              key={item.key}
              className="bar-chart__column"
              role="img"
              tabIndex={0}
              aria-label={`${item.label}：${format(item.value)}${
                item.status ? `，${STATUS_LABEL[item.status]}` : ''
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            >
              <span className="bar-chart__value" style={{ bottom: barHeight + 6 }}>
                {format(item.value)}
              </span>
              <span className="bar-chart__bar" style={{ height: barHeight }} />
            </div>
          );
        })}
      </div>

      <div className="bar-chart__labels" aria-hidden="true">
        {data.map((item) => (
          <span key={item.key} className="bar-chart__label">
            {item.label}
          </span>
        ))}
      </div>

      <p className={active ? 'bar-chart__detail is-active' : 'bar-chart__detail'}>
        {active ? (
          <>
            <strong>{active.label}</strong>：{format(active.value)} ·{' '}
            {deltaText(active.value, activeIndex ?? 0)}
            {active.status && (
              <span className={`bar-chart__status ${STATUS_CLASS[active.status]}`}>
                <span className="bar-chart__dot" aria-hidden="true" />
                {STATUS_LABEL[active.status]}
              </span>
            )}
          </>
        ) : (
          '悬停或聚焦柱形查看相对基线的变化'
        )}
      </p>
    </figure>
  );
}
