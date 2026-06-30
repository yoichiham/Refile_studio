import { describe, expect, it } from 'vitest';
import { timestampFileName, withExtension } from './filename';

describe('timestampFileName', () => {
  it('ローカル日時を YYYYMMDD_HHMMSS + 拡張子で整形する', () => {
    const d = new Date(2026, 5, 24, 9, 8, 7); // 2026-06-24 09:08:07 (local)
    expect(timestampFileName('md', d)).toBe('20260624_090807.md');
  });

  it('月日・時分秒を 2 桁ゼロ埋めする', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5); // 2026-01-02 03:04:05
    expect(timestampFileName('pdf', d)).toBe('20260102_030405.pdf');
  });

  it('先頭ドット付きの拡張子も受け付ける', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(timestampFileName('.jpg', d)).toBe('20261231_235959.jpg');
  });
});

describe('withExtension', () => {
  it('元の拡張子を新しい拡張子に置き換える', () => {
    expect(withExtension('IMG_1234.heic', 'jpg')).toBe('IMG_1234.jpg');
    expect(withExtension('song.flac', 'mp3')).toBe('song.mp3');
  });
  it('先頭ドット付きの拡張子も受け付ける', () => {
    expect(withExtension('photo.HEIF', '.png')).toBe('photo.png');
  });
  it('拡張子がない場合は付与する', () => {
    expect(withExtension('noext', 'wav')).toBe('noext.wav');
  });
  it('名前に複数のドットがあっても最後の拡張子のみ置換', () => {
    expect(withExtension('my.song.v2.flac', 'mp3')).toBe('my.song.v2.mp3');
  });
  it('空名・空白名はタイムスタンプ無しのフォールバック名を使う', () => {
    expect(withExtension('', 'mp3')).toBe('converted.mp3');
    expect(withExtension('   ', 'wav')).toBe('converted.wav');
  });
});
