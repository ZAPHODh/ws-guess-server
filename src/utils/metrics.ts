import { logger } from './logger';

class Metrics {
  private counters = new Map<string, number>();
  private timers = new Map<string, number[]>();

  increment(metric: string, value = 1) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
  }

  timing(metric: string, duration: number) {
    const timings = this.timers.get(metric) || [];
    timings.push(duration);
    this.timers.set(metric, timings);
  }

  getMetrics() {
    const metrics: Record<string, unknown> = {};

    for (const [key, value] of this.counters.entries()) {
      metrics[key] = value;
    }

    for (const [key, timings] of this.timers.entries()) {
      if (timings.length > 0) {
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        metrics[`${key}_avg`] = Math.round(avg * 100) / 100;
        metrics[`${key}_p95`] = this.percentile(timings, 95);
        metrics[`${key}_count`] = timings.length;
      }
    }

    return metrics;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return Math.round((sorted[index] || 0) * 100) / 100;
  }

  reset() {
    this.counters.clear();
    this.timers.clear();
  }
}

export const metrics = new Metrics();

// Export metrics every 60 seconds
setInterval(() => {
  const currentMetrics = metrics.getMetrics();
  if (Object.keys(currentMetrics).length > 0) {
    logger.info('Performance metrics', currentMetrics);
  }
  metrics.reset();
}, 60000);
