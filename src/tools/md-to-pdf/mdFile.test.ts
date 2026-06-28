import { describe, expect, it } from 'vitest';
import { EMPTY_TEXT_ERROR, buildMarkdownFile } from './mdFile';

// jsdom の Blob は .text() 未実装のため FileReader で読み取る。
// readAsText はデコード時に UTF-8 BOM を除去するため、本文の比較に用いる。
function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// BOM 検証用に生バイトを読み取る。
function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('buildMarkdownFile', () => {
  it('空欄・空白のみはエラーを返す', () => {
    expect(buildMarkdownFile('   ')).toEqual({ error: EMPTY_TEXT_ERROR });
    expect(buildMarkdownFile('')).toEqual({ error: EMPTY_TEXT_ERROR });
  });

  it('内容ありは .md Blob とタイムスタンプ名を返す（UTF-8 BOM ＋ CRLF）', async () => {
    const d = new Date(2026, 5, 24, 1, 2, 3);
    const out = buildMarkdownFile('# Hello\n本文', d);
    expect('result' in out).toBe(true);
    if ('result' in out) {
      expect(out.result.fileName).toBe('20260624_010203.md');
      expect(out.result.blob.type).toBe('text/markdown;charset=utf-8');
      // 先頭に UTF-8 BOM（EF BB BF）が付く
      const bytes = await readBlobBytes(out.result.blob);
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      // 本文は CRLF に正規化される（readAsText は BOM を除去）
      expect(await readBlobText(out.result.blob)).toBe('# Hello\r\n本文');
    }
  });

  it('既存の CRLF を二重変換しない', async () => {
    const out = buildMarkdownFile('a\r\nb');
    expect('result' in out).toBe(true);
    if ('result' in out) {
      expect(await readBlobText(out.result.blob)).toBe('a\r\nb');
    }
  });

  it('10万文字でも正常に処理できる', () => {
    const out = buildMarkdownFile('a'.repeat(100000));
    expect('result' in out).toBe(true);
  });
});
