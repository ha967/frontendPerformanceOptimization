import { useEffect, useRef, useState } from 'react';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { getRenderStats } from './renderStats';

export interface PerformanceSnapshot {
  lcp: number | null;
  lcpElement: string | null;
  lcpUrl: string | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  inp: number | null;
  imageRequests: number;
  imageBytes: number;
  totalRequests: number;
  totalBytes: number;
  longTaskCount: number;
  longTaskTime: number;
  longTaskSupported: boolean;
  scrollFps: number | null;
  worstFrame: number | null;
  domNodes: number;
  imageElements: number;
  cardCommits: number;
}

function emptySnapshot(): PerformanceSnapshot {
  return {
    lcp: null,
    lcpElement: null,
    lcpUrl: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
    imageRequests: 0,
    imageBytes: 0,
    totalRequests: 0,
    totalBytes: 0,
    longTaskCount: 0,
    longTaskTime: 0,
    longTaskSupported: false,
    scrollFps: null,
    worstFrame: null,
    domNodes: 0,
    imageElements: 0,
    cardCommits: 0,
  };
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    const file = parsed.pathname.split('/').filter(Boolean).at(-1);
    return file ?? parsed.pathname;
  } catch {
    return url;
  }
}

function describeElement(element: Element | null): string | null {
  if (!element) {
    return null;
  }
  const tag = element.tagName.toLowerCase();
  if (element instanceof HTMLImageElement) {
    const src = element.currentSrc || element.src;
    return src ? `${tag} · ${shortenUrl(src)}` : tag;
  }
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  return text ? `${tag} · ${text.slice(0, 48)}` : tag;
}

/**
 * 采集 Core Web Vitals、资源、长任务、滚动 FPS 与卡片提交信息。
 * 只建议在生产构建下对比；开发模式的 HMR / 未压缩代码会显著拉高指标。
 */
export function usePerformanceMetrics(): PerformanceSnapshot {
  const metricsRef = useRef<PerformanceSnapshot>(emptySnapshot());
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(() => emptySnapshot());

  useEffect(() => {
    const metrics = metricsRef.current;
    Object.assign(metrics, emptySnapshot());

    // web-vitals v6 的 onX 返回 void，回调只写入 ref；页面级指标随整页刷新重建。
    onLCP(
      (metric) => {
        const entry = metric.entries[metric.entries.length - 1];
        metrics.lcp = metric.value;
        if (entry) {
          metrics.lcpUrl = entry.url || null;
          metrics.lcpElement = describeElement(entry.element);
        }
      },
      { reportAllChanges: true },
    );
    onCLS(
      (metric) => {
        metrics.cls = metric.value;
      },
      { reportAllChanges: true },
    );
    onFCP((metric) => {
      metrics.fcp = metric.value;
    });
    onTTFB((metric) => {
      metrics.ttfb = metric.value;
    });
    onINP(
      (metric) => {
        metrics.inp = metric.value;
      },
      { reportAllChanges: true },
    );

    const seenResources = new Set<string>();
    const recordResource = (entry: PerformanceResourceTiming) => {
      const key = `${entry.name}@${entry.startTime}`;
      if (seenResources.has(key)) {
        return;
      }
      seenResources.add(key);
      const bytes = entry.transferSize || 0;
      metrics.totalRequests += 1;
      metrics.totalBytes += bytes;
      if (entry.initiatorType === 'img') {
        metrics.imageRequests += 1;
        metrics.imageBytes += bytes;
      }
    };

    performance.getEntriesByType('resource').forEach(recordResource);
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordResource(entry as PerformanceResourceTiming);
      }
    });
    resourceObserver.observe({ type: 'resource', buffered: true });

    let longTaskObserver: PerformanceObserver | null = null;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.longTaskCount += 1;
          metrics.longTaskTime += entry.duration;
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      metrics.longTaskSupported = true;
    } catch {
      metrics.longTaskSupported = false;
    }

    let sampling = false;
    let rafId = 0;
    let samplingStartedAt = 0;
    let lastFrameAt = 0;
    let frameCount = 0;
    let worstDelta = 0;

    const sampleFrame = (now: number) => {
      if (!sampling) {
        return;
      }
      if (lastFrameAt > 0) {
        const delta = now - lastFrameAt;
        frameCount += 1;
        if (delta > worstDelta) {
          worstDelta = delta;
        }
      }
      lastFrameAt = now;
      if (now - samplingStartedAt >= 1000) {
        const elapsed = now - samplingStartedAt;
        metrics.scrollFps = Math.round((frameCount * 1000) / elapsed);
        metrics.worstFrame = Math.round(worstDelta);
        sampling = false;
        return;
      }
      rafId = requestAnimationFrame(sampleFrame);
    };

    const handleScroll = () => {
      if (sampling) {
        return;
      }
      sampling = true;
      samplingStartedAt = performance.now();
      lastFrameAt = 0;
      frameCount = 0;
      worstDelta = 0;
      rafId = requestAnimationFrame(sampleFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const updateSnapshot = () => {
      setSnapshot({
        ...metrics,
        domNodes: document.getElementsByTagName('*').length,
        imageElements: document.images.length,
        cardCommits: getRenderStats().cardCommits,
      });
    };
    updateSnapshot();
    const intervalId = window.setInterval(updateSnapshot, 500);

    return () => {
      resourceObserver.disconnect();
      longTaskObserver?.disconnect();
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
      window.clearInterval(intervalId);
    };
  }, []);

  return snapshot;
}
