import { pdfjsLib } from '../../lib/pdfjs';
import { PDF_LOAD_ERROR, PDF_PASSWORD_ERROR } from '../../lib/pdfErrors';

export interface PageThumbnail {
  pageNumber: number;
  thumbnail: string; // data URL
}

function mapThumbError(e: unknown): Error {
  const name = (e as { name?: string } | null)?.name;
  return new Error(name === 'PasswordException' ? PDF_PASSWORD_ERROR : PDF_LOAD_ERROR);
}

/** PDF 各ページのサムネイル（data URL）を生成する（SPEC §6.7、§6.3 の pdfjs 基盤を流用）。 */
export async function renderThumbnails(data: ArrayBuffer): Promise<PageThumbnail[]> {
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    throw mapThumbError(e);
  }

  const pages: PageThumbnail[] = [];
  try {
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 140 / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(PDF_LOAD_ERROR);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push({ pageNumber: n, thumbnail: canvas.toDataURL('image/jpeg', 0.7) });
      page.cleanup();
    }
  } finally {
    pdf.destroy();
  }
  return pages;
}
