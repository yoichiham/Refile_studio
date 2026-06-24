import { describe, expect, it } from 'vitest';
import {
  INVALID_SIZE_ERROR,
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
