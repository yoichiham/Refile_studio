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
