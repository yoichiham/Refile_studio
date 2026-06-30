import { describe, expect, it } from 'vitest';
import {
  INVALID_SIZE_ERROR,
  YOUTUBE_THUMBNAIL,
  coverCropRect,
  findQualityForMaxSize,
  fitDimension,
  formatFromMime,
  formatInfo,
  scaleDimensions,
  validateDimensions,
} from './logic';

describe('fitDimension', () => {
  it('幅のみ指定で高さを比率維持で算出', () => {
    expect(fitDimension(200, 100, 100, null)).toEqual({ width: 100, height: 50 });
  });
  it('高さのみ指定で幅を比率維持で算出', () => {
    expect(fitDimension(200, 100, null, 50)).toEqual({ width: 100, height: 50 });
  });
  it('未指定は元サイズを返す', () => {
    expect(fitDimension(200, 100, null, null)).toEqual({ width: 200, height: 100 });
  });
});

describe('scaleDimensions', () => {
  it('パーセント指定で四捨五入したサイズを返す', () => {
    expect(scaleDimensions(1170, 2532, 50)).toEqual({ width: 585, height: 1266 });
    expect(scaleDimensions(100, 100, 150)).toEqual({ width: 150, height: 150 });
  });
});

describe('validateDimensions', () => {
  it('1px と 9999px は許可（境界）', () => {
    expect(validateDimensions(1, 1)).toBeNull();
    expect(validateDimensions(9999, 9999)).toBeNull();
  });
  it('0 以下・10000 以上はエラー', () => {
    expect(validateDimensions(0, 100)).toBe(INVALID_SIZE_ERROR);
    expect(validateDimensions(100, 10000)).toBe(INVALID_SIZE_ERROR);
  });
});

describe('formatInfo', () => {
  it('各出力フォーマットの mime と拡張子', () => {
    expect(formatInfo('png')).toEqual({ mime: 'image/png', ext: 'png' });
    expect(formatInfo('jpeg')).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(formatInfo('webp')).toEqual({ mime: 'image/webp', ext: 'webp' });
  });
});

describe('formatFromMime', () => {
  it('入力 MIME から出力フォーマットを推定（未対応は png）', () => {
    expect(formatFromMime('image/jpeg')).toBe('jpeg');
    expect(formatFromMime('image/webp')).toBe('webp');
    expect(formatFromMime('image/png')).toBe('png');
    expect(formatFromMime('image/gif')).toBe('png');
  });
});

describe('coverCropRect', () => {
  it('同じ縦横比ならクロップせず全面を使う', () => {
    expect(coverCropRect(1280, 720, 1280, 720)).toEqual({ sx: 0, sy: 0, sw: 1280, sh: 720 });
  });
  it('元画像が横長すぎる場合は左右をクロップ（高さ基準）', () => {
    // 2000x720（21:7.56）を 16:9 にする → 高さ720維持、幅 = 720*16/9 = 1280、左右を中央クロップ
    expect(coverCropRect(2000, 720, 1280, 720)).toEqual({ sx: 360, sy: 0, sw: 1280, sh: 720 });
  });
  it('元画像が縦長すぎる場合は上下をクロップ（幅基準）', () => {
    // 720x2000 を 16:9 にする → 幅720維持、高さ = 720*9/16 = 405、上下を中央クロップ
    expect(coverCropRect(720, 2000, 1280, 720)).toEqual({ sx: 0, sy: 797.5, sw: 720, sh: 405 });
  });
});

describe('YOUTUBE_THUMBNAIL', () => {
  it('YouTube 推奨の 1280x720・上限 2MB を持つ', () => {
    expect(YOUTUBE_THUMBNAIL).toEqual({ width: 1280, height: 720, maxBytes: 2 * 1024 * 1024 });
  });
});

describe('findQualityForMaxSize', () => {
  // quality に対し単調増加でサイズを返すモック（quality*4MB のバイト数）
  const encode = (quality: number) => Promise.resolve(Math.round(quality * 4 * 1024 * 1024));

  it('上限以下になる最大品質を二分探索で求める', async () => {
    // size = quality*4MB <= 2MB → quality <= 0.5。探索で 0.5 近傍に収束する
    const q = await findQualityForMaxSize(encode, 2 * 1024 * 1024, { iterations: 20 });
    expect(q).toBeLessThanOrEqual(0.5);
    expect(q).toBeGreaterThan(0.49);
  });

  it('最高品質でも上限以下なら最高品質を返す', async () => {
    const q = await findQualityForMaxSize(encode, 10 * 1024 * 1024, {
      maxQuality: 0.95,
      iterations: 10,
    });
    expect(q).toBeGreaterThan(0.9);
  });

  it('最低品質でも上限を超える場合はフォールバックで最低品質を返す', async () => {
    const q = await findQualityForMaxSize(encode, 1, { minQuality: 0.4, iterations: 10 });
    expect(q).toBe(0.4);
  });
});
