export type HeicOutputFormat = 'jpeg' | 'png';

export const HEIC_TYPE_ERROR = 'HEIC / HEIF ファイルを選択してください';
export const HEIC_SIZE_ERROR = 'ファイルサイズは50MB以下にしてください';
export const HEIC_CONVERT_ERROR = 'HEIC ファイルを変換できませんでした';

/** HEIC の最大サイズ = 50MB（ちょうどは許可、超過はエラー）。 */
export const MAX_HEIC_BYTES = 50 * 1024 * 1024;

/** 受付対象の拡張子。HEIC の MIME は OS により空になるため拡張子で判定する。 */
export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const;

export interface HeicOutputInfo {
  mime: string;
  ext: string;
}

export function heicOutputInfo(format: HeicOutputFormat): HeicOutputInfo {
  return format === 'jpeg'
    ? { mime: 'image/jpeg', ext: 'jpg' }
    : { mime: 'image/png', ext: 'png' };
}

/** HEIC ファイルを拡張子・サイズで検証。エラーは日本語、正常は null。 */
export function validateHeicFile(name: string, size: number): string | null {
  const lower = name.toLowerCase();
  if (!HEIC_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return HEIC_TYPE_ERROR;
  }
  if (size > MAX_HEIC_BYTES) {
    return HEIC_SIZE_ERROR;
  }
  return null;
}
