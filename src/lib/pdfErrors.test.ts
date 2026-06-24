import { describe, expect, it } from 'vitest';
import { PDF_LOAD_ERROR, PDF_PASSWORD_ERROR, mapPdfLibError } from './pdfErrors';

describe('mapPdfLibError', () => {
  it('暗号化（パスワード保護）はパスワードメッセージにする', () => {
    expect(mapPdfLibError({ name: 'EncryptedPDFError' })).toBe(PDF_PASSWORD_ERROR);
    expect(mapPdfLibError(new Error('document is encrypted'))).toBe(PDF_PASSWORD_ERROR);
  });
  it('その他のエラーは読み込みエラーにする', () => {
    expect(mapPdfLibError(new Error('broken'))).toBe(PDF_LOAD_ERROR);
    expect(mapPdfLibError(null)).toBe(PDF_LOAD_ERROR);
  });
});
