export const PDF_TYPE_ERROR = 'PDF ファイルを選択してください';
export const PDF_SIZE_ERROR = 'ファイルサイズは100MB以下にしてください';

/** PDF の最大サイズ = 100MB（ちょうどは許可、超過はエラー）。 */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

/**
 * PDF ファイルを MIME・拡張子・サイズで検証する。エラーは日本語、正常は null。
 * D&D では OS により type が空になることがあるため、拡張子 .pdf でも許可する
 * （HEIC と同様のフォールバック）。
 */
export function validatePdfFile(file: { name: string; type: string; size: number }): string | null {
  const isPdfType = file.type === 'application/pdf';
  const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType && !isPdfExt) {
    return PDF_TYPE_ERROR;
  }
  if (file.size > MAX_PDF_BYTES) {
    return PDF_SIZE_ERROR;
  }
  return null;
}
