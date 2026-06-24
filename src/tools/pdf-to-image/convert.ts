import { canvasToBlob } from '../../lib/image';
import { pdfjsLib } from '../../lib/pdfjs';
import { type Quality, pageFileName, renderSettings } from './logic';

export const PDF_PASSWORD_ERROR = 'パスワードで保護されたPDFは変換できません';
export const PDF_LOAD_ERROR = 'ファイルを読み込めませんでした';

export interface PageImage {
  name: string;
  blob: Blob;
}

/** pdfjs の例外を日本語メッセージ付き Error に変換する（SPEC §6.3）。 */
function mapPdfError(e: unknown): Error {
  const name = (e as { name?: string } | null)?.name;
  if (name === 'PasswordException') return new Error(PDF_PASSWORD_ERROR);
  return new Error(PDF_LOAD_ERROR);
}

/**
 * PDF の各ページを JPEG 画像に変換する（SPEC §6.3）。
 * メモリ節約のためページを逐次描画し、終わったら解放する。
 */
export async function pdfToImages(
  data: ArrayBuffer,
  quality: Quality,
  onProgress?: (current: number, total: number) => void,
): Promise<PageImage[]> {
  const { scale, jpegQuality } = renderSettings(quality);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    throw mapPdfError(e);
  }

  const total = pdf.numPages;
  const images: PageImage[] = [];
  try {
    for (let n = 1; n <= total; n += 1) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(PDF_LOAD_ERROR);
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push({ name: pageFileName(n, total), blob: await canvasToBlob(canvas, 'image/jpeg', jpegQuality) });
      page.cleanup();
      onProgress?.(n, total);
    }
  } finally {
    pdf.destroy();
  }
  return images;
}
