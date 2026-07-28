import { canvasToBlob } from '../../lib/image';
import { pdfjsLib } from '../../lib/pdfjs';
import { type PdfImageFormat, type Quality, imageFormatInfo, pageFileName, renderSettings } from './logic';

export const PDF_PASSWORD_ERROR = 'パスワードで保護されたPDFは変換できません';
export const PDF_LOAD_ERROR = 'ファイルを読み込めませんでした';

export interface PageImage {
  name: string;
  blob: Blob;
}

/** pdfjs の例外を日本語メッセージ付き Error に変換する（SPEC §6.5）。 */
function mapPdfError(e: unknown): Error {
  const name = (e as { name?: string } | null)?.name;
  if (name === 'PasswordException') return new Error(PDF_PASSWORD_ERROR);
  return new Error(PDF_LOAD_ERROR);
}

export interface PdfToImagesOptions {
  /** 出力フォーマット。既定 JPEG。 */
  format?: PdfImageFormat;
  /** 対象ページ番号（1始まり）。省略時は全ページ。 */
  pages?: readonly number[];
  onProgress?: (current: number, total: number) => void;
}

/**
 * PDF の指定ページを画像に変換する（SPEC §6.5）。
 * メモリ節約のためページを逐次描画し、終わったら解放する。
 */
export async function pdfToImages(
  data: ArrayBuffer,
  quality: Quality,
  options: PdfToImagesOptions = {},
): Promise<PageImage[]> {
  const { format = 'jpeg', pages, onProgress } = options;
  const { scale, jpegQuality } = renderSettings(quality);
  const { mime, ext } = imageFormatInfo(format);

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    throw mapPdfError(e);
  }

  const totalPages = pdf.numPages;
  const targetPages = pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);
  const images: PageImage[] = [];
  try {
    for (let i = 0; i < targetPages.length; i += 1) {
      const n = targetPages[i];
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(PDF_LOAD_ERROR);
      await page.render({ canvasContext: ctx, viewport }).promise;
      // PNG に quality を渡しても無視されるだけだが、意図を明確にするため明示的に分岐する
      const blob = await canvasToBlob(canvas, mime, format === 'png' ? undefined : jpegQuality);
      // ファイル名のゼロ埋め幅は元PDFの総ページ数基準（範囲指定で一部だけ出力しても
      // page_007 のように元のページ番号が分かる名前のまま）
      images.push({ name: pageFileName(n, totalPages, ext), blob });
      page.cleanup();
      onProgress?.(i + 1, targetPages.length);
    }
  } finally {
    pdf.destroy();
  }
  return images;
}
