import { describe, expect, it } from 'vitest';
import {
  PAGE_RANGE_BOUNDS_ERROR,
  PAGE_RANGE_FORMAT_ERROR,
  describePageSelection,
  parsePageRange,
} from './pageRange';

describe('parsePageRange', () => {
  it('空文字は全ページを返す', () => {
    expect(parsePageRange('', 5)).toEqual({ pages: [1, 2, 3, 4, 5] });
  });

  it('単一ページ番号', () => {
    expect(parsePageRange('3', 10)).toEqual({ pages: [3] });
  });

  it('範囲指定', () => {
    expect(parsePageRange('1-3', 10)).toEqual({ pages: [1, 2, 3] });
  });

  it('範囲＋単一の混在、重複は排除', () => {
    expect(parsePageRange('1-3,3,5', 10)).toEqual({ pages: [1, 2, 3, 5] });
  });

  it('入力順が前後していても昇順に整列', () => {
    expect(parsePageRange('5,1', 10)).toEqual({ pages: [1, 5] });
  });

  it('前後の空白・カンマ周りの空白を許容', () => {
    expect(parsePageRange(' 1 - 3 , 5 ', 10)).toEqual({ pages: [1, 2, 3, 5] });
  });

  it('全角カンマを許容', () => {
    expect(parsePageRange('1，2', 10)).toEqual({ pages: [1, 2] });
  });

  it('全角ハイフンを許容', () => {
    expect(parsePageRange('1－3', 10)).toEqual({ pages: [1, 2, 3] });
  });

  it('波ダッシュ（全角チルダ）を範囲区切りとして許容', () => {
    expect(parsePageRange('1〜3', 10)).toEqual({ pages: [1, 2, 3] });
  });

  it('連続カンマ等の空要素は無視する', () => {
    expect(parsePageRange('1,,2', 10)).toEqual({ pages: [1, 2] });
  });

  it('0 は範囲外エラー', () => {
    expect(parsePageRange('0', 10)).toEqual({ error: PAGE_RANGE_BOUNDS_ERROR });
  });

  it('総ページ数を超える指定は範囲外エラー', () => {
    expect(parsePageRange('11', 10)).toEqual({ error: PAGE_RANGE_BOUNDS_ERROR });
  });

  it('数字以外は形式エラー', () => {
    expect(parsePageRange('abc', 10)).toEqual({ error: PAGE_RANGE_FORMAT_ERROR });
  });

  it('終端のない範囲指定は形式エラー', () => {
    expect(parsePageRange('1-', 10)).toEqual({ error: PAGE_RANGE_FORMAT_ERROR });
  });

  it('開始が終了より大きい範囲は形式エラー', () => {
    expect(parsePageRange('3-1', 10)).toEqual({ error: PAGE_RANGE_FORMAT_ERROR });
  });

  it('総ページ数が0以下なら常に範囲外エラー', () => {
    expect(parsePageRange('', 0)).toEqual({ error: PAGE_RANGE_BOUNDS_ERROR });
    expect(parsePageRange('1', 0)).toEqual({ error: PAGE_RANGE_BOUNDS_ERROR });
  });
});

describe('describePageSelection', () => {
  it('全ページ選択時は「全Nページ」', () => {
    expect(describePageSelection([1, 2, 3], 3)).toBe('全 3 ページ');
  });

  it('一部選択時は内訳を表示', () => {
    expect(describePageSelection([1, 3], 10)).toBe('10 ページ中 2 ページを選択');
  });
});
