import { pdfjsLib } from './pdfjs';
import { PDF_LOAD_ERROR, PDF_PASSWORD_ERROR } from './pdfErrors';

function mapError(e: unknown): Error {
  const name = (e as { name?: string } | null)?.name;
  return new Error(name === 'PasswordException' ? PDF_PASSWORD_ERROR : PDF_LOAD_ERROR);
}

/** PDF の最初のページを JPEG data URL として描画する（ファイルリストのサムネイル用）。 */
export async function renderPdfFirstPage(data: ArrayBuffer): Promise<string> {
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    throw mapError(e);
  }
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 140 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(PDF_LOAD_ERROR);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    page.cleanup();
    return dataUrl;
  } finally {
    pdf.destroy();
  }
}
