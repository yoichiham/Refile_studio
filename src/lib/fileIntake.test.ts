import { describe, expect, it } from 'vitest';
import { partitionFiles, rejectionMessage } from './fileIntake';

interface Named {
  name: string;
}

describe('partitionFiles', () => {
  const noPdf = (f: Named) => (f.name.endsWith('.pdf') ? null : 'PDF ファイルを選択してください');

  it('全部有効なら valid に全件、rejected は空', () => {
    const files = [{ name: 'a.pdf' }, { name: 'b.pdf' }];
    const result = partitionFiles(files, noPdf);
    expect(result.valid).toEqual(files);
    expect(result.rejected).toEqual([]);
  });

  it('全部無効なら valid が空、rejected に全件', () => {
    const files = [{ name: 'a.txt' }, { name: 'b.txt' }];
    const result = partitionFiles(files, noPdf);
    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([
      { name: 'a.txt', message: 'PDF ファイルを選択してください' },
      { name: 'b.txt', message: 'PDF ファイルを選択してください' },
    ]);
  });

  it('混在時は順序を保ったまま振り分ける', () => {
    const files = [{ name: 'a.pdf' }, { name: 'b.txt' }, { name: 'c.pdf' }];
    const result = partitionFiles(files, noPdf);
    expect(result.valid.map((f) => f.name)).toEqual(['a.pdf', 'c.pdf']);
    expect(result.rejected.map((r) => r.name)).toEqual(['b.txt']);
  });

  it('空配列なら valid・rejected とも空', () => {
    const result = partitionFiles([], noPdf);
    expect(result.valid).toEqual([]);
    expect(result.rejected).toEqual([]);
  });
});

describe('rejectionMessage', () => {
  it('0件なら空文字', () => {
    expect(rejectionMessage([])).toBe('');
  });

  it('1件なら名前と理由を1つ表示', () => {
    const msg = rejectionMessage([{ name: 'a.txt', message: 'PDF ファイルを選択してください' }]);
    expect(msg).toBe('a.txt（PDF ファイルを選択してください）を除外しました');
  });

  it('4件で maxNames=2 なら2件表示して「ほか2件」', () => {
    const rejected = [
      { name: 'a.txt', message: 'エラーA' },
      { name: 'b.txt', message: 'エラーB' },
      { name: 'c.txt', message: 'エラーC' },
      { name: 'd.txt', message: 'エラーD' },
    ];
    const msg = rejectionMessage(rejected, 2);
    expect(msg).toBe('a.txt（エラーA）、b.txt（エラーB） ほか2件を除外しました');
  });

  it('同名重複があっても件数どおりに扱う', () => {
    const rejected = [
      { name: 'a.txt', message: 'エラー' },
      { name: 'a.txt', message: 'エラー' },
    ];
    const msg = rejectionMessage(rejected, 5);
    expect(msg).toBe('a.txt（エラー）、a.txt（エラー）を除外しました');
  });
});
