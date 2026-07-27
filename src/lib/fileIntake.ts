export interface RejectedFile {
  name: string;
  message: string;
}

export interface PartitionedFiles<T> {
  valid: T[];
  rejected: RejectedFile[];
}

/**
 * ファイル配列を検証関数で valid/rejected に振り分ける。
 * D&D は accept 属性による絞り込みが効かないため、投入時点でツール側が
 * この関数を通して弾く（画像・HEIC・PDF 系ツール共通）。
 */
export function partitionFiles<T extends { name: string }>(
  files: readonly T[],
  validate: (file: T) => string | null,
): PartitionedFiles<T> {
  const valid: T[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    const message = validate(file);
    if (message) {
      rejected.push({ name: file.name, message });
    } else {
      valid.push(file);
    }
  }
  return { valid, rejected };
}

/**
 * 除外ファイルの要約メッセージを組み立てる。
 * 「a.txt（PDF ファイルを選択してください）ほか2件を除外しました」の形式。
 * maxNames を超える分は件数のみ「ほかN件」で表示する。
 */
export function rejectionMessage(rejected: readonly RejectedFile[], maxNames = 2): string {
  if (rejected.length === 0) return '';
  const shown = rejected.slice(0, maxNames);
  const shownText = shown.map((r) => `${r.name}（${r.message}）`).join('、');
  const restCount = rejected.length - shown.length;
  return restCount > 0 ? `${shownText} ほか${restCount}件を除外しました` : `${shownText}を除外しました`;
}
