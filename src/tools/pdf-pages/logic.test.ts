import { describe, expect, it } from 'vitest';
import {
  applySelection,
  combineRotation,
  initialOrder,
  movePage,
  pagePdfName,
  removeAt,
  rotateBy,
} from './logic';

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

describe('rotateBy', () => {
  it('90度ずつ加算', () => {
    expect(rotateBy(0, 90)).toBe(90);
  });
  it('270から90加算で0に戻る（360で正規化）', () => {
    expect(rotateBy(270, 90)).toBe(0);
  });
  it('負の delta で逆回転できる', () => {
    expect(rotateBy(0, -90)).toBe(270);
  });
  it('180+180で0に戻る', () => {
    expect(rotateBy(180, 180)).toBe(0);
  });
  it('360を超える delta も正規化される', () => {
    expect(rotateBy(90, 450)).toBe(180);
  });
});

describe('combineRotation', () => {
  it('元PDFの既存回転に相対回転を加算する', () => {
    expect(combineRotation(90, 90)).toBe(180);
  });
  it('加算結果が360を超えたら正規化される', () => {
    expect(combineRotation(270, 180)).toBe(90);
  });
  it('相対回転0なら元の角度のまま', () => {
    expect(combineRotation(90, 0)).toBe(90);
  });
});

describe('initialOrder', () => {
  it('1始まりの連番を返す', () => {
    expect(initialOrder(3)).toEqual([1, 2, 3]);
  });
  it('0ページなら空配列', () => {
    expect(initialOrder(0)).toEqual([]);
  });
});

describe('applySelection', () => {
  it('order の並び順を保ったまま selected に含まれるものだけ残す', () => {
    expect(applySelection([3, 1, 2], [1, 2])).toEqual([1, 2]);
  });
  it('selected が空なら空配列', () => {
    expect(applySelection([1, 2, 3], [])).toEqual([]);
  });
  it('selected が order 全体を含むなら order のまま', () => {
    expect(applySelection([3, 1, 2], [1, 2, 3])).toEqual([3, 1, 2]);
  });
});
