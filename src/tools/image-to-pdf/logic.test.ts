import { describe, expect, it } from 'vitest';
import { fitContain, needsNormalization } from './logic';

describe('fitContain', () => {
  it('幅が制約のとき幅いっぱい・比率維持・上下中央寄せ', () => {
    expect(fitContain(1000, 500, 400, 400)).toEqual({ width: 400, height: 200, x: 0, y: 100 });
  });
  it('高さが制約のとき高さいっぱい・左右中央寄せ', () => {
    expect(fitContain(500, 1000, 400, 400)).toEqual({ width: 200, height: 400, x: 100, y: 0 });
  });
});

describe('needsNormalization', () => {
  it('PNG / JPEG はそのまま埋め込み可（false）', () => {
    expect(needsNormalization('image/png')).toBe(false);
    expect(needsNormalization('image/jpeg')).toBe(false);
  });
  it('WebP / GIF / BMP は正規化が必要（true）', () => {
    expect(needsNormalization('image/webp')).toBe(true);
    expect(needsNormalization('image/gif')).toBe(true);
    expect(needsNormalization('image/bmp')).toBe(true);
  });
});
