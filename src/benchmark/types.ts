import type { PerformanceSnapshot } from '../metrics/usePerformanceMetrics';

export interface BenchmarkEnvironment {
  browser: string;
  viewport: string;
  network: string;
  cpuThrottling: number;
  runs: number;
  scope: string;
}

export interface BenchmarkStep {
  index: number;
  title: string;
  summary: string;
  median: PerformanceSnapshot;
  runs: PerformanceSnapshot[];
}

export interface BenchmarkResults {
  generatedAt: string;
  environment: BenchmarkEnvironment;
  steps: BenchmarkStep[];
}
