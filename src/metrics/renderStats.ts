let cardCommits = 0;

/**
 * 由 FeedCard 的 effect 在每次提交后调用。
 * 不用 <Profiler>：标准生产构建里 Profiler 会被禁用，而这里需要一个构建产物下也可用的渲染指标。
 */
export function recordCardCommit(): void {
  cardCommits += 1;
}

export function getRenderStats(): { cardCommits: number } {
  return { cardCommits };
}
