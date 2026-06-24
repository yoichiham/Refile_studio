export type Quality = 'standard' | 'high';

export interface RenderSettings {
  dpi: number;
  scale: number;
  jpegQuality: number;
}

/**
 * 品質設定から描画パラメータを返す（SPEC §6.3）。
 * PDF は 72dpi 基準なので scale = dpi / 72。
 */
export function renderSettings(quality: Quality): RenderSettings {
  const dpi = quality === 'high' ? 300 : 150;
  const jpegQuality = quality === 'high' ? 0.9 : 0.8;
  return { dpi, scale: dpi / 72, jpegQuality };
}

/** 総ページ数の桁数でゼロ埋めしたページ画像ファイル名（ZIP 内で使用）。 */
export function pageFileName(pageNumber: number, totalPages: number): string {
  const width = String(totalPages).length;
  return `page_${String(pageNumber).padStart(width, '0')}.jpg`;
}
