/**
 * 画像 Blob を HTMLImageElement に読み込む。
 * GIF などのアニメーションは、img に読み込んだ時点の最初のフレームが描画される（SPEC §6.2）。
 */
export function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };
    img.src = url;
  });
}

/**
 * 画像を指定サイズの canvas に描画する。
 * background を渡すと先に塗りつぶす（透過画像を JPEG にする際の黒化防止）。
 */
export function drawToCanvas(
  img: CanvasImageSource,
  width: number,
  height: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas を初期化できませんでした');
  }
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/** canvas を Blob に変換する（quality は JPEG/WebP のみ有効、PNG は無視される）。 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の変換に失敗しました'))),
      mime,
      quality,
    );
  });
}
