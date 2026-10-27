export type MetricStatus = 'good' | 'needs-improvement' | 'poor' | 'unknown';

export type RatedMetric = 'lcp' | 'cls' | 'inp' | 'fcp' | 'ttfb';

const THRESHOLDS: Record<RatedMetric, [number, number]> = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  inp: [200, 500],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
};

export function rateMetric(metric: RatedMetric, value: number | null): MetricStatus {
  if (value === null || Number.isNaN(value)) {
    return 'unknown';
  }
  const [good, poor] = THRESHOLDS[metric];
  if (value <= good) {
    return 'good';
  }
  if (value <= poor) {
    return 'needs-improvement';
  }
  return 'poor';
}

export const STATUS_LABEL: Record<MetricStatus, string> = {
  good: '良好',
  'needs-improvement': '待改进',
  poor: '差',
  unknown: '等待数据',
};

export function formatMs(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${Math.round(value)} ms`;
}

export function formatCls(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(3);
}

export function formatNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('zh-CN');
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) {
    return '—';
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${Math.round(bytes)} B`;
}
