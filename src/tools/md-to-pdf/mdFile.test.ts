import { describe, expect, it } from 'vitest';
import { EMPTY_TEXT_ERROR, buildMarkdownFile } from './mdFile';

// jsdom の Blob は .text() 未実装のため FileReader で読み取る
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('buildMarkdownFile', () => {
  it('空欄・空白のみはエラーを返す', () => {
    expect(buildMarkdownFile('   ')).toEqual({ error: EMPTY_TEXT_ERROR });
    expect(buildMarkdownFile('')).toEqual({ error: EMPTY_TEXT_ERROR });
  });

  it('内容ありは .md Blob とタイムスタンプ名を返す', async () => {
    const d = new Date(2026, 5, 24, 1, 2, 3);
    const out = buildMarkdownFile('# Hello\n本文', d);
    expect('result' in out).toBe(true);
    if ('result' in out) {
      expect(out.result.fileName).toBe('20260624_010203.md');
      expect(out.result.blob.type).toBe('text/markdown;charset=utf-8');
      expect(await readBlobText(out.result.blob)).toBe('# Hello\n本文');
    }
  });

  it('10万文字でも正常に処理できる', () => {
    const out = buildMarkdownFile('a'.repeat(100000));
    expect('result' in out).toBe(true);
  });
});
