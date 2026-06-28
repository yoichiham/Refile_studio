export type Quality = 'low' | 'standard' | 'high' | 'max';

export interface RenderSettings {
  dpi: number;
  scale: number;
  jpegQuality: number;
}

/** 各画質の dpi / JPEG 品質。max（600dpi）は大量ページで負荷が高い。 */
const QUALITY_TABLE: Record<Quality, { dpi: number; jpegQuality: number }> = {
  low: { dpi: 96, jpegQuality: 0.7 },
  standard: { dpi: 150, jpegQuality: 0.8 },
  high: { dpi: 300, jpegQuality: 0.9 },
  max: { dpi: 600, jpegQuality: 0.95 },
};

/** 画質選択 UI 用のラベル定義（順序＝表示順）。 */
export const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'low', label: '低画質（軽量・Web共有 / 96dpi）' },
  { value: 'standard', label: '標準（150dpi / JPEG 80%）' },
  { value: 'high', label: '高画質（300dpi / JPEG 90%）' },
  { value: 'max', label: '最高画質（印刷・OCR / 600dpi）' },
];

/**
 * 品質設定から描画パラメータを返す（SPEC §6.3）。
 * PDF は 72dpi 基準なので scale = dpi / 72。
 */
export function renderSettings(quality: Quality): RenderSettings {
  const { dpi, jpegQuality } = QUALITY_TABLE[quality];
  return { dpi, scale: dpi / 72, jpegQuality };
}

/** 総ページ数の桁数でゼロ埋めしたページ画像ファイル名（ZIP 内で使用）。 */
export function pageFileName(pageNumber: number, totalPages: number): string {
  const width = String(totalPages).length;
  return `page_${String(pageNumber).padStart(width, '0')}.jpg`;
}
