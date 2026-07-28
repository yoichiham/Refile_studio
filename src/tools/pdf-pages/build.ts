import type { PDFPage } from 'pdf-lib';
import { bytesToBlob } from '../../lib/download';
import { mapPdfLibError } from '../../lib/pdfErrors';
import { type Rotation, combineRotation, pagePdfName } from './logic';

/** ページ番号（元PDF基準・1始まり）→ 相対回転角のマップ。未指定ページは 0 扱い。 */
export type RotationMap = Record<number, Rotation>;

/**
 * page の回転を rotations[pageNumber] だけ相対的に変更する。
 * 絶対値でセットすると元から回転済みのPDF（スキャナ出力等）で意図しない結果になるため、
 * 必ず既存の getRotation().angle に加算する（combineRotation 参照）。
 */
async function applyRotation(page: PDFPage, pageNumber: number, rotations: RotationMap | undefined): Promise<void> {
  const delta = rotations?.[pageNumber];
  if (!delta) return;
  const { degrees } = await import('pdf-lib');
  page.setRotation(degrees(combineRotation(page.getRotation().angle, delta)));
}

/** 指定したページ番号（1始まり）を順に並べた単一 PDF を作る（SPEC §6.7）。 */
export async function extractToSinglePdf(
  data: ArrayBuffer,
  order: number[],
  rotations?: RotationMap,
): Promise<Blob> {
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
  for (let i = 0; i < copied.length; i += 1) {
    out.addPage(copied[i]);
    await applyRotation(copied[i], order[i], rotations);
  }
  const bytes = await out.save();
  return bytesToBlob(bytes, 'application/pdf');
}

/** 指定ページを 1 ページずつ個別 PDF に分割する（複数出力＝ZIP 用。SPEC §6.7）。 */
export async function splitToPdfs(
  data: ArrayBuffer,
  order: number[],
  rotations?: RotationMap,
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
    await applyRotation(page, order[i], rotations);
    const bytes = await out.save();
    results.push({
      name: pagePdfName(i + 1, order.length),
      blob: bytesToBlob(bytes, 'application/pdf'),
    });
  }
  return results;
}
