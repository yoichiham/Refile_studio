/** 画像ツールが受け付ける入力 MIME（SPEC §6.2） */
export const IMAGE_INPUT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
];

/** 画像の最大サイズ = 10MB（10MB ちょうどは許可、超過はエラー） */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** 寸法の上限（10000px 以上はエラー＝最大は 9999px） */
export const MAX_DIMENSION = 9999;

/** 空文字・空白のみなら true */
export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

/** size が上限以下なら true（上限ちょうどは許可） */
export function isWithinSize(size: number, maxBytes: number): boolean {
  return size <= maxBytes;
}

/** type が許可リストに含まれれば true */
export function isAllowedType(type: string, allowed: readonly string[]): boolean {
  return allowed.includes(type);
}

/** 1〜9999 の整数なら true（0 以下・10000 以上・非整数は false） */
export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION;
}

/**
 * 画像ファイルを検証し、エラーがあれば日本語メッセージ、なければ null を返す（SPEC §6.2）。
 */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!isAllowedType(file.type, IMAGE_INPUT_TYPES)) {
    return '対応していないファイル形式です';
  }
  if (!isWithinSize(file.size, MAX_IMAGE_BYTES)) {
    return 'ファイルサイズは10MB以下にしてください';
  }
  return null;
}
