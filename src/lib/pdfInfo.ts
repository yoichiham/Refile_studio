import { pdfjsLib } from './pdfjs';
import { PDF_LOAD_ERROR, PDF_PASSWORD_ERROR } from './pdfErrors';

function mapError(e: unknown): Error {
  const name = (e as { name?: string } | null)?.name;
  return new Error(name === 'PasswordException' ? PDF_PASSWORD_ERROR : PDF_LOAD_ERROR);
}

export interface PdfInfo {
  numPages: number;
  firstPageThumbnail: string;
}

/**
 * PDF の総ページ数と1ページ目サムネイルを1回のドキュメントオープンで取得する。
 * ページ範囲UIには総ページ数が必要だが、既存の renderPdfFirstPage（pdfThumbnail.ts）
 * は返さない。同じPDFを2回開く無駄を避けるためにこちらを使う。
 */
export async function readPdfInfo(data: ArrayBuffer, thumbWidth = 140): Promise<PdfInfo> {
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    throw mapError(e);
  }
  try {
    const numPages = pdf.numPages;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: thumbWidth / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(PDF_LOAD_ERROR);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const firstPageThumbnail = canvas.toDataURL('image/jpeg', 0.7);
    page.cleanup();
    return { numPages, firstPageThumbnail };
  } finally {
    pdf.destroy();
  }
}
