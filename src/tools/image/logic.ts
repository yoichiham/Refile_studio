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

/** YouTube サムネイルの推奨仕様（1280×720・上限 2MB）。 */
export const YOUTUBE_THUMBNAIL = {
  width: 1280,
  height: 720,
  maxBytes: 2 * 1024 * 1024,
} as const;

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * "Cover" 方式（object-fit: cover 相当）で、target の縦横比に合わせた中央クロップ矩形を求める。
 * 元画像が target より横長なら左右を、縦長なら上下を中央基準でクロップする。
 */
export function coverCropRect(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
): CropRect {
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;
  if (srcRatio > targetRatio) {
    // 元画像が横長すぎる → 高さ維持で左右をクロップ
    const sh = srcHeight;
    const sw = sh * targetRatio;
    return { sx: (srcWidth - sw) / 2, sy: 0, sw, sh };
  }
  // 元画像が縦長すぎる（または同比率） → 幅維持で上下をクロップ
  const sw = srcWidth;
  const sh = sw / targetRatio;
  return { sx: 0, sy: (srcHeight - sh) / 2, sw, sh };
}

/**
 * 二分探索でファイルサイズが maxBytes 以下になる最大の quality（0-1）を求める。
 * encode(quality) は実エンコードを行い生成バイト数を返す（テスト時はモック注入）。
 * 最低品質でも上限を超える場合は最低品質をフォールバックとして返す。
 */
export async function findQualityForMaxSize(
  encode: (quality: number) => Promise<number>,
  maxBytes: number,
  options: { minQuality?: number; maxQuality?: number; iterations?: number } = {},
): Promise<number> {
  const minQ = options.minQuality ?? 0.4;
  const maxQ = options.maxQuality ?? 0.95;
  const iterations = options.iterations ?? 6;
  let lo = minQ;
  let hi = maxQ;
  let best = minQ;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const size = await encode(mid);
    if (size <= maxBytes) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}
