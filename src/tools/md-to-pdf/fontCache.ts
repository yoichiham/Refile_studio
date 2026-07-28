const FONT_FILES = ['NotoSansJP-Regular.ttf', 'NotoSansJP-Bold.ttf'];
const FONTS_CACHE_NAME = 'fonts-cache';

/** Noto Sans JP のフォントURL一覧（vite base を反映）。 */
export function fontUrls(baseUrl: string): string[] {
  return FONT_FILES.map((f) => `${baseUrl}fonts/${f}`);
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Save-Data 有効時・低速回線（2g/slow-2g）時は自動プリフェッチしない。
 * Network Information API 非対応ブラウザ（Safari等）では常に取得してよい。
 */
export function shouldAutoPrefetch(conn: NetworkInformationLike | undefined): boolean {
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return false;
  return true;
}

/** フォントが既に Service Worker のキャッシュ（fonts-cache）に存在するか。 */
export async function isJapaneseFontCached(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  const cache = await caches.open(FONTS_CACHE_NAME);
  const base = import.meta.env.BASE_URL;
  const matches = await Promise.all(fontUrls(base).map((url) => cache.match(url)));
  return matches.every((m) => m !== undefined);
}

/**
 * フォントをバックグラウンド取得し破棄する。
 * runtime caching（vite.config.ts の CacheFirst）が Service Worker 経由で自動保存する。
 */
export async function prefetchJapaneseFont(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  await Promise.all(
    fontUrls(base).map(async (url) => {
      const res = await fetch(url);
      await res.arrayBuffer();
    }),
  );
}
