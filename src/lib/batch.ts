export type BatchItemStatus = 'pending' | 'running' | 'done' | 'error';

export interface BatchItemResult {
  name: string;
  blob: Blob;
}

export interface BatchFailure {
  fileName: string;
  message: string;
}

export interface BatchOutcome {
  results: BatchItemResult[];
  failures: BatchFailure[];
  cancelled: boolean;
}

export interface RunBatchOptions<T> {
  onProgress?: (done: number, total: number, current: T) => void;
  onStatus?: (index: number, status: BatchItemStatus) => void;
  signal?: AbortSignal;
}

/**
 * ファイル配列を1件ずつ逐次変換する（並列にすると HEIC 50MB×複数枚等で
 * デコード済みビットマップが同時にメモリへ乗り実機で落ちるため）。
 * 1件の失敗で全体を止めず、成功分だけ results に積み上げて続行する。
 */
export async function runBatch<T extends { name: string }>(
  files: readonly T[],
  convert: (file: T, index: number) => Promise<BatchItemResult>,
  options: RunBatchOptions<T> = {},
): Promise<BatchOutcome> {
  const { onProgress, onStatus, signal } = options;
  const results: BatchItemResult[] = [];
  const failures: BatchFailure[] = [];

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      return { results, failures, cancelled: true };
    }
    const file = files[i];
    onStatus?.(i, 'running');
    try {
      const result = await convert(file, i);
      results.push(result);
      onStatus?.(i, 'done');
    } catch (e) {
      failures.push({ fileName: file.name, message: e instanceof Error ? e.message : String(e) });
      onStatus?.(i, 'error');
    }
    onProgress?.(i + 1, files.length, file);
  }

  return { results, failures, cancelled: false };
}

/**
 * 出力名の衝突を "name (2).ext" 形式で回避する（iPhone の IMG_0001.HEIC
 * 重複のような、同名ファイルが複数選択された場合の対策）。
 * taken には既に確定した名前を都度追加していく想定。
 */
export function uniqueName(taken: Set<string>, name: string): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (taken.has(candidate)) {
    n++;
    candidate = `${base} (${n})${ext}`;
  }
  taken.add(candidate);
  return candidate;
}

/** バッチ処理結果の要約メッセージ。全成功なら空文字（表示しない想定）。 */
export function batchSummaryMessage(succeeded: number, failed: number): string {
  if (failed === 0) return '';
  const total = succeeded + failed;
  if (succeeded === 0) {
    return `${total} 件中 ${failed} 件が失敗しました`;
  }
  return `${total} 件中 ${failed} 件が失敗しました（変換できた ${succeeded} 件のみダウンロードしました）`;
}

/** 一度に処理できる件数の上限を検証する。 */
export function validateBatchCount(count: number, max: number): string | null {
  return count > max ? `一度に処理できるのは${max}件までです` : null;
}
