import { bytesToBlob } from '../../lib/download';
import { mapPdfLibError } from '../../lib/pdfErrors';

/**
 * 複数 PDF を並び順に結合する（SPEC §6.6）。
 * パスワード保護・破損は日本語メッセージの Error として投げる。pdf-lib は動的 import。
 */
export async function mergePdfs(files: File[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();

  for (const file of files) {
    let src;
    try {
      src = await PDFDocument.load(await file.arrayBuffer());
    } catch (e) {
      throw new Error(mapPdfLibError(e));
    }
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }

  const bytes = await out.save();
  return bytesToBlob(bytes, 'application/pdf');
}
