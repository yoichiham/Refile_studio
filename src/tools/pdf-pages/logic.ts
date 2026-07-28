export const EMPTY_SELECTION_ERROR = 'ページを1つ以上残してください';

/** 配列内の要素を delta だけ移動した新配列を返す（範囲外はそのまま）。 */
export function movePage(order: number[], index: number, delta: number): number[] {
  const target = index + delta;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** 指定位置を取り除いた新配列を返す。 */
export function removeAt(order: number[], index: number): number[] {
  return order.filter((_, i) => i !== index);
}

/** 個別分割時のページ PDF 名（総数の桁でゼロ埋め）。 */
export function pagePdfName(position: number, total: number): string {
  const width = String(total).length;
  return `page_${String(position).padStart(width, '0')}.pdf`;
}

export type Rotation = 0 | 90 | 180 | 270;

/** 現在の回転角に delta（90刻み）を加算し 0/90/180/270 に正規化する。 */
export function rotateBy(current: Rotation, delta: number): Rotation {
  return (((current + delta) % 360) + 360) % 360 as Rotation;
}

/**
 * 元PDFの既存回転（pdf-lib の page.getRotation().angle）に相対回転を加算する。
 * 絶対値でセットしてはいけない — 元から /Rotate 90 のPDF（スキャナ出力等）に
 * setRotation(degrees(90)) を当てると「何も回らない」バグになる。
 */
export function combineRotation(baseAngle: number, delta: Rotation): number {
  return ((baseAngle + delta) % 360 + 360) % 360;
}

/** 1始まりの連番配列を返す（ページ順序の初期値・全ページ復元に使用）。 */
export function initialOrder(totalPages: number): number[] {
  return Array.from({ length: Math.max(0, totalPages) }, (_, i) => i + 1);
}

/** order の並び順を保ったまま、selected に含まれるページ番号だけを残す。 */
export function applySelection(order: number[], selected: readonly number[]): number[] {
  const selectedSet = new Set(selected);
  return order.filter((n) => selectedSet.has(n));
}
