import { describe, expect, it } from 'vitest';
import { pageFileName, renderSettings } from './logic';

describe('renderSettings', () => {
  it('標準画質は 150dpi / JPEG 80%', () => {
    expect(renderSettings('standard')).toEqual({ dpi: 150, scale: 150 / 72, jpegQuality: 0.8 });
  });
  it('高画質は 300dpi / JPEG 90%', () => {
    expect(renderSettings('high')).toEqual({ dpi: 300, scale: 300 / 72, jpegQuality: 0.9 });
  });
});

describe('pageFileName', () => {
  it('総ページ数の桁数でゼロ埋めする', () => {
    expect(pageFileName(1, 9)).toBe('page_1.jpg');
    expect(pageFileName(1, 10)).toBe('page_01.jpg');
    expect(pageFileName(12, 100)).toBe('page_012.jpg');
  });
});
