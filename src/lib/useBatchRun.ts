import { useCallback, useRef, useState } from 'react';
import { type BatchFailure, type BatchItemResult, type BatchItemStatus, runBatch } from './batch';
import { downloadResults } from './download';

export interface BatchProgress {
  done: number;
  total: number;
  currentName: string;
}

export interface UseBatchRun {
  busy: boolean;
  progress: BatchProgress | null;
  statuses: BatchItemStatus[];
  failures: BatchFailure[];
  run: <T extends { name: string }>(
    files: readonly T[],
    convert: (file: T, index: number) => Promise<BatchItemResult>,
    options: { zipName: string },
  ) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

/**
 * バッチ変換の進捗・状態をローカル state として保持するフック。
 * useToolState（セッションストア）には置かない — 更新のたびに全ツールの
 * 全コンシューマが再レンダーされる既知の制約があるため（session.tsx 参照）。
 * 出力 Blob もセッションには残さず、完了時にその場でダウンロードして手放す。
 */
export function useBatchRun(): UseBatchRun {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [statuses, setStatuses] = useState<BatchItemStatus[]>([]);
  const [failures, setFailures] = useState<BatchFailure[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async <T extends { name: string }>(
      files: readonly T[],
      convert: (file: T, index: number) => Promise<BatchItemResult>,
      options: { zipName: string },
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setProgress(null);
      setStatuses(files.map(() => 'pending'));
      setFailures([]);
      try {
        const outcome = await runBatch(files, convert, {
          signal: controller.signal,
          onProgress: (done, total, current) => setProgress({ done, total, currentName: current.name }),
          onStatus: (index, status) =>
            setStatuses((prev) => {
              const next = [...prev];
              next[index] = status;
              return next;
            }),
        });
        setFailures(outcome.failures);
        if (!outcome.cancelled && outcome.results.length > 0) {
          await downloadResults(outcome.results, options.zipName);
        }
      } finally {
        setBusy(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setStatuses([]);
    setFailures([]);
    setProgress(null);
  }, []);

  return { busy, progress, statuses, failures, run, cancel, reset };
}
