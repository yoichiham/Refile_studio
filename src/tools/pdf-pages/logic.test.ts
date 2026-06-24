import { describe, expect, it } from 'vitest';
import { movePage, pagePdfName, removeAt } from './logic';

describe('movePage', () => {
  it('上へ移動する', () => {
    expect(movePage([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
  });
  it('下へ移動する', () => {
    expect(movePage([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
  });
  it('範囲外への移動はそのまま', () => {
    expect(movePage([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(movePage([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe('removeAt', () => {
  it('指定位置を削除する', () => {
    expect(removeAt([1, 2, 3], 1)).toEqual([1, 3]);
  });
});

describe('pagePdfName', () => {
  it('総数の桁でゼロ埋めした個別PDF名', () => {
    expect(pagePdfName(1, 9)).toBe('page_1.pdf');
    expect(pagePdfName(2, 12)).toBe('page_02.pdf');
  });
});
