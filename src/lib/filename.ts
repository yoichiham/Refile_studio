/**
 * ローカル時刻から `YYYYMMDD_HHMMSS.<ext>` のファイル名を生成する（SPEC §6.1 / §6.4）。
 *
 * @param extension 拡張子（先頭ドットは有無どちらでも可）
 * @param date 基準日時。既定は現在時刻
 */
export function timestampFileName(extension: string, date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${stamp}.${ext}`;
}
