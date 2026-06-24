/** A4縦のサイズ（pt） */
export const A4 = { width: 595.28, height: 841.89 };
/** 余白 20mm（pt） */
export const MARGIN = (20 * 72) / 25.4;

export const NO_IMAGES_ERROR = '画像を選択してください';

/**
 * 画像をボックス内にアスペクト比維持でフィットさせ、中央寄せの矩形を返す（SPEC §6.5）。
 * 戻り値の x/y はボックス左下原点からのオフセット。
 */
export function fitContain(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { width: number; height: number; x: number; y: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { width, height, x: (boxW - width) / 2, y: (boxH - height) / 2 };
}

/** pdf-lib が直接埋め込めるのは PNG / JPEG のみ。それ以外は Canvas 正規化が必要（CLAUDE.md 落とし穴）。 */
export function needsNormalization(type: string): boolean {
  return type !== 'image/png' && type !== 'image/jpeg';
}
