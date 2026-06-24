import { bytesToBlob } from '../../lib/download';
import { canvasToBlob, drawToCanvas, loadImageElement } from '../../lib/image';
import { A4, MARGIN, fitContain, needsNormalization } from './logic';

/** 埋め込み可能なバイト列に変換する。PNG/JPEG はそのまま、それ以外は Canvas で PNG 化。 */
async function toEmbeddable(file: File): Promise<{ bytes: ArrayBuffer; png: boolean }> {
  if (!needsNormalization(file.type)) {
    return { bytes: await file.arrayBuffer(), png: file.type === 'image/png' };
  }
  const img = await loadImageElement(file);
  const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
  const blob = await canvasToBlob(canvas, 'image/png');
  return { bytes: await blob.arrayBuffer(), png: true };
}

/**
 * 複数画像を1つの PDF に結合する（1画像=1ページ、A4縦・余白20mm・比率維持。SPEC §6.5）。
 * pdf-lib は重いので動的 import する（SPEC §9-6）。
 */
export async function imagesToPdf(files: File[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();

  for (const file of files) {
    const { bytes, png } = await toEmbeddable(file);
    const image = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    // 横長画像はA4横向き、縦長はA4縦向きにしてページ内の余白を減らす
    const landscape = image.width > image.height;
    const pageW = landscape ? A4.height : A4.width;
    const pageH = landscape ? A4.width : A4.height;
    const curBoxW = pageW - MARGIN * 2;
    const curBoxH = pageH - MARGIN * 2;
    const page = doc.addPage([pageW, pageH]);
    const fit = fitContain(image.width, image.height, curBoxW, curBoxH);
    page.drawImage(image, {
      x: MARGIN + fit.x,
      y: MARGIN + fit.y,
      width: fit.width,
      height: fit.height,
    });
  }

  const pdfBytes = await doc.save();
  return bytesToBlob(pdfBytes, 'application/pdf');
}
