import { describe, expect, it } from 'vitest';
import { formatBytes, reductionPercent } from './format';

describe('formatBytes', () => {
  it('B / KB / MB を1桁小数で整形する', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(236134)).toBe('230.6 KB');
    expect(formatBytes(1.8 * 1024 * 1024)).toBe('1.8 MB');
  });
});

describe('reductionPercent', () => {
  it('削減率を1桁小数で返す', () => {
    expect(reductionPercent(1000, 750)).toBe(25);
    expect(reductionPercent(1000, 1000)).toBe(0);
  });
  it('増加した場合は負の値', () => {
    expect(reductionPercent(800, 1000)).toBe(-25);
  });
});
