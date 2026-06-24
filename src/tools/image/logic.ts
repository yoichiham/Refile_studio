import { isValidDimension } from '../../lib/validation';

export const INVALID_SIZE_ERROR = '正しいサイズを指定してください';

/** リサイズのパーセントプリセット。 */
export const PERCENT_PRESETS = [25, 50, 75, 100, 150, 200] as const;

export type OutputFormat = 'png' | 'jpeg' | 'webp';

export interface FormatInfo {
  mime: string;
  ext: string;
}

export function formatInfo(format: OutputFormat): FormatInfo {
  switch (format) {
    case 'png':
      return { mime: 'image/png', ext: 'png' };
    case 'jpeg':
      return { mime: 'image/jpeg', ext: 'jpg' };
    case 'webp':
      return { mime: 'image/webp', ext: 'webp' };
  }
}

/** MIME から出力フォーマットを推定（未対応は png）。 */
export function formatFromMime(mime: string): OutputFormat {
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

/**
 * アスペクト比を維持して目標寸法を確定する。
 * 片方のみ指定ならもう片方を比率から算出（四捨五入、最小 1px）。
 */
export function fitDimension(
  origW: number,
  origH: number,
  w: number | null,
  h: number | null,
): { width: number; height: number } {
  if (w != null && h != null) return { width: w, height: h };
  if (w != null) return { width: w, height: Math.max(1, Math.round((w * origH) / origW)) };
  if (h != null) return { width: Math.max(1, Math.round((h * origW) / origH)), height: h };
  return { width: origW, height: origH };
}

/** 元サイズに対しパーセント拡縮した寸法（四捨五入、最小 1px）。 */
export function scaleDimensions(
  origW: number,
  origH: number,
  percent: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round((origW * percent) / 100)),
    height: Math.max(1, Math.round((origH * percent) / 100)),
  };
}

/** 目標寸法を検証し、範囲外なら日本語メッセージ、正常なら null。 */
export function validateDimensions(width: number, height: number): string | null {
  if (!isValidDimension(width) || !isValidDimension(height)) return INVALID_SIZE_ERROR;
  return null;
}
