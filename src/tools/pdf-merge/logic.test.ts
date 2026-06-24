import { describe, expect, it } from 'vitest';
import { TOO_FEW_PDFS_ERROR, validateMergeInput } from './logic';

describe('validateMergeInput', () => {
  it('2未満はエラー', () => {
    expect(validateMergeInput(0)).toBe(TOO_FEW_PDFS_ERROR);
    expect(validateMergeInput(1)).toBe(TOO_FEW_PDFS_ERROR);
  });
  it('2以上は null', () => {
    expect(validateMergeInput(2)).toBeNull();
    expect(validateMergeInput(5)).toBeNull();
  });
});
