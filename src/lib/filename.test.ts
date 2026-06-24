import { describe, expect, it } from 'vitest';
import { timestampFileName } from './filename';

describe('timestampFileName', () => {
  it('ローカル日時を YYYYMMDD_HHMMSS + 拡張子で整形する', () => {
    const d = new Date(2026, 5, 24, 9, 8, 7); // 2026-06-24 09:08:07 (local)
    expect(timestampFileName('md', d)).toBe('20260624_090807.md');
  });

  it('月日・時分秒を 2 桁ゼロ埋めする', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // 2026-01-02 03:04:05
    expect(timestampFileName('pdf', d)).toBe('20260102_030405.pdf');
  });

  it('先頭ドット付きの拡張子も受け付ける', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(timestampFileName('.jpg', d)).toBe('20261231_235959.jpg');
  });
});
