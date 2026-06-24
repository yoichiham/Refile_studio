import { buildDocDefinition, tableLayouts } from './docDefinition';
import { ensureJapaneseFont, type PdfMakeLike } from './fonts';

/**
 * Markdown からベクター PDF を生成してダウンロードする（SPEC §6.4）。
 * pdfmake は重いので動的 import で遅延ロードする（SPEC §9-6）。
 */
export async function generateMarkdownPdf(markdown: string, fileName: string): Promise<void> {
  // UMD モジュールのため型は緩く受ける
  const mod = (await import('pdfmake/build/pdfmake')) as unknown as {
    default?: PdfMakeLike;
  } & PdfMakeLike;
  const pdfMake = (mod.default ?? mod) as PdfMakeLike;

  await ensureJapaneseFont(pdfMake);
  pdfMake.createPdf(buildDocDefinition(markdown), tableLayouts).download(fileName);
}
