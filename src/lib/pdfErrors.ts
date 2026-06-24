// PDF 編集系ツール（結合・ページ操作）共通のエラーメッセージ（SPEC §6.6 / §6.7）。
export const PDF_PASSWORD_ERROR = 'パスワードで保護されたPDFは操作できません';
export const PDF_LOAD_ERROR = 'ファイルを読み込めませんでした';

/** pdf-lib 等の例外を日本語メッセージに変換する。暗号化は専用メッセージ。 */
export function mapPdfLibError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  const message = (e as { message?: string } | null)?.message ?? '';
  if (name.includes('Encrypted') || /encrypt/i.test(message)) {
    return PDF_PASSWORD_ERROR;
  }
  return PDF_LOAD_ERROR;
}
