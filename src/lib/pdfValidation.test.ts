import { describe, expect, it } from 'vitest';
import { MAX_PDF_BYTES, PDF_SIZE_ERROR, PDF_TYPE_ERROR, validatePdfFile } from './pdfValidation';

describe('validatePdfFile', () => {
  it('application/pdf の MIME なら許可', () => {
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: 100 })).toBeNull();
  });

  it('MIME が空でも .pdf 拡張子なら許可（D&D で type が空になる場合の救済）', () => {
    expect(validatePdfFile({ name: 'a.pdf', type: '', size: 100 })).toBeNull();
  });

  it('大文字拡張子 .PDF も許可', () => {
    expect(validatePdfFile({ name: 'a.PDF', type: '', size: 100 })).toBeNull();
  });

  it('MIME も拡張子も PDF でなければエラー', () => {
    expect(validatePdfFile({ name: 'a.txt', type: 'text/plain', size: 100 })).toBe(PDF_TYPE_ERROR);
  });

  it('ちょうど MAX_PDF_BYTES は許可', () => {
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_PDF_BYTES })).toBeNull();
  });

  it('MAX_PDF_BYTES を1バイトでも超えるとエラー', () => {
    expect(validatePdfFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_PDF_BYTES + 1 })).toBe(
      PDF_SIZE_ERROR,
    );
  });
});
