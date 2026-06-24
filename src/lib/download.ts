/** Blob をローカルにダウンロードさせる（サーバー送信なし。SPEC §2.1-1）。 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
