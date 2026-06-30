import { describe, expect, it } from 'vitest';
import {
  HEIC_SIZE_ERROR,
  HEIC_TYPE_ERROR,
  heicOutputInfo,
  validateHeicFile,
} from './logic';

describe('heicOutputInfo', () => {
  it('jpeg / png の mime と拡張子', () => {
    expect(heicOutputInfo('jpeg')).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(heicOutputInfo('png')).toEqual({ mime: 'image/png', ext: 'png' });
  });
});

describe('validateHeicFile', () => {
  it('.heic / .heif は許可（大文字小文字問わず）', () => {
    expect(validateHeicFile('IMG_1234.heic', 1000)).toBeNull();
    expect(validateHeicFile('photo.HEIF', 1000)).toBeNull();
  });
  it('非対応拡張子はエラー', () => {
    expect(validateHeicFile('photo.jpg', 1000)).toBe(HEIC_TYPE_ERROR);
    expect(validateHeicFile('noext', 1000)).toBe(HEIC_TYPE_ERROR);
  });
  it('50MB 超はエラー（ちょうどは許可）', () => {
    const max = 50 * 1024 * 1024;
    expect(validateHeicFile('a.heic', max)).toBeNull();
    expect(validateHeicFile('a.heic', max + 1)).toBe(HEIC_SIZE_ERROR);
  });
});
