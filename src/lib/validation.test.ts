import { describe, expect, it } from 'vitest';
import {
  IMAGE_INPUT_TYPES,
  MAX_IMAGE_BYTES,
  isAllowedType,
  isBlank,
  isValidDimension,
  isWithinSize,
  validateImageFile,
} from './validation';

describe('isBlank', () => {
  it('空文字・空白のみは true', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('  \n\t ')).toBe(true);
  });
  it('内容があれば false', () => {
    expect(isBlank(' a ')).toBe(false);
  });
});

describe('isWithinSize', () => {
  it('上限ちょうど（10MB）は許可', () => {
    expect(isWithinSize(MAX_IMAGE_BYTES, MAX_IMAGE_BYTES)).toBe(true);
  });
  it('上限を 1 バイトでも超えたら拒否', () => {
    expect(isWithinSize(MAX_IMAGE_BYTES + 1, MAX_IMAGE_BYTES)).toBe(false);
  });
});

describe('isAllowedType', () => {
  it('許可された MIME は true', () => {
    expect(isAllowedType('image/png', IMAGE_INPUT_TYPES)).toBe(true);
    expect(isAllowedType('image/gif', IMAGE_INPUT_TYPES)).toBe(true);
  });
  it('対象外 MIME は false', () => {
    expect(isAllowedType('application/pdf', IMAGE_INPUT_TYPES)).toBe(false);
    expect(isAllowedType('text/plain', IMAGE_INPUT_TYPES)).toBe(false);
  });
});

describe('isValidDimension', () => {
  it('1px と 9999px は許可（境界）', () => {
    expect(isValidDimension(1)).toBe(true);
    expect(isValidDimension(9999)).toBe(true);
  });
  it('0 以下・10000 以上・非整数は拒否', () => {
    expect(isValidDimension(0)).toBe(false);
    expect(isValidDimension(-3)).toBe(false);
    expect(isValidDimension(10000)).toBe(false);
    expect(isValidDimension(12.5)).toBe(false);
    expect(isValidDimension(NaN)).toBe(false);
  });
});

describe('validateImageFile', () => {
  it('対象外形式は専用メッセージ', () => {
    expect(validateImageFile({ type: 'application/pdf', size: 100 })).toBe(
      '対応していないファイル形式です',
    );
  });
  it('10MB 超はサイズエラー', () => {
    expect(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toBe(
      'ファイルサイズは10MB以下にしてください',
    );
  });
  it('10MB ちょうどの許可形式は null（エラーなし）', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES })).toBeNull();
  });
});
