import { bytesToBlob } from '../../lib/download';
import { mapPdfLibError } from '../../lib/pdfErrors';
import { pagePdfName } from './logic';

/** 指定したページ番号（1始まり）を順に並べた単一 PDF を作る（SPEC §6.7）。 */
export async function extractToSinglePdf(data: ArrayBuffer, order: number[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  let src;
  try {
    src = await PDFDocument.load(data);
  } catch (e) {
    throw new Error(mapPdfLibError(e));
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    order.map((n) => n - 1),
  );
  copied.forEach((page) => out.addPage(page));
  const bytes = await out.save();
  return bytesToBlob(bytes, 'application/pdf');
}

/** 指定ページを 1 ページずつ個別 PDF に分割する（複数出力＝ZIP 用。SPEC §6.7）。 */
export async function splitToPdfs(
  data: ArrayBuffer,
  order: number[],
): Promise<{ name: string; blob: Blob }[]> {
  const { PDFDocument } = await import('pdf-lib');
  let src;
  try {
    src = await PDFDocument.load(data);
  } catch (e) {
    throw new Error(mapPdfLibError(e));
  }
  const results: { name: string; blob: Blob }[] = [];
  for (let i = 0; i < order.length; i += 1) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [order[i] - 1]);
    out.addPage(page);
    const bytes = await out.save();
    results.push({
      name: pagePdfName(i + 1, order.length),
      blob: bytesToBlob(bytes, 'application/pdf'),
    });
  }
  return results;
}
