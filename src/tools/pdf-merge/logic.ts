export const TOO_FEW_PDFS_ERROR = 'PDFを2つ以上選択してください';

/** 結合は 2 ファイル以上必要（SPEC §6.6）。 */
export function validateMergeInput(count: number): string | null {
  return count < 2 ? TOO_FEW_PDFS_ERROR : null;
}
