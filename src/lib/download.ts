/**
 * Blob をローカルにダウンロードさせる（サーバー送信なし。SPEC §2.1-1）。
 * revoke は click 直後ではなく遅延実行する。Safari/Firefox では大容量 Blob の
 * ダウンロード開始前に objectURL が失効し、ダウンロードが失敗することがあるため。
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 文字列を指定 MIME の Blob にしてダウンロードする。 */
export function downloadText(text: string, fileName: string, mime = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: mime }), fileName);
}

/**
 * Uint8Array を Blob に変換する。
 * ArrayBuffer 裏付けにコピーしてから生成し、TS 5.7 の型付き配列（ArrayBufferLike）制約を回避する。
 */
export function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type: mime });
}

/**
 * 一括処理の結果をダウンロードする。1件なら単体ファイル、2件以上は ZIP に
 * まとめる（PDF→画像・PDFページ操作の既存パターンを共通化）。0件は何もしない。
 * JSZip は動的 import し、単体ダウンロードのみのツールのバンドルに含めない。
 */
export async function downloadResults(
  results: readonly { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  if (results.length === 0) return;
  if (results.length === 1) {
    downloadBlob(results[0].blob, results[0].name);
    return;
  }
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  results.forEach((r) => zip.file(r.name, r.blob));
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipName);
}
