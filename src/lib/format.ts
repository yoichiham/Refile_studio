/** バイト数を B / KB / MB（1桁小数）で表示する。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** 削減率（%、1桁小数）。負なら増加。 */
export function reductionPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 1000) / 10;
}
