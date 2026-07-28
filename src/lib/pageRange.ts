export const PAGE_RANGE_FORMAT_ERROR = 'ページ指定の形式が正しくありません（例: 1-5,10,20-25）';
export const PAGE_RANGE_BOUNDS_ERROR = 'ページ番号が範囲外です';

export type PageRangeResult = { pages: number[] } | { error: string };

/**
 * "1-5,10,20-25" 形式のページ指定を解析する。空文字は全ページ。
 * 結果は昇順・重複排除。全角カンマ/ハイフン/波ダッシュも許容する
 * （日本語IMEでの入力時に全角のまま入力されることが多いため）。
 */
export function parsePageRange(input: string, totalPages: number): PageRangeResult {
  if (totalPages <= 0) return { error: PAGE_RANGE_BOUNDS_ERROR };

  const trimmed = input.trim();
  if (trimmed === '') {
    return { pages: Array.from({ length: totalPages }, (_, i) => i + 1) };
  }

  const normalized = trimmed
    .replace(/[，、]/g, ',')
    .replace(/[〜～]/g, '-')
    .replace(/[－ー―]/g, '-');

  const parts = normalized
    .split(',')
    .map((p) => p.replace(/\s+/g, ''))
    .filter((p) => p !== '');
  if (parts.length === 0) return { error: PAGE_RANGE_FORMAT_ERROR };

  const set = new Set<number>();
  for (const part of parts) {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(part);
    const singleMatch = /^(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start > end) return { error: PAGE_RANGE_FORMAT_ERROR };
      for (let n = start; n <= end; n++) set.add(n);
    } else if (singleMatch) {
      set.add(Number(singleMatch[1]));
    } else {
      return { error: PAGE_RANGE_FORMAT_ERROR };
    }
  }

  const pages = Array.from(set).sort((a, b) => a - b);
  if (pages.some((n) => n < 1 || n > totalPages)) {
    return { error: PAGE_RANGE_BOUNDS_ERROR };
  }
  return { pages };
}

/** ページ選択の要約文（「全12ページ」/「12ページ中5ページを選択」）。 */
export function describePageSelection(pages: number[], totalPages: number): string {
  if (pages.length === totalPages) return `全 ${totalPages} ページ`;
  return `${totalPages} ページ中 ${pages.length} ページを選択`;
}
