import { timestampFileName } from '../../lib/filename';
import { isBlank } from '../../lib/validation';

export const EMPTY_TEXT_ERROR = 'テキストを入力してください';

/** UTF-8 BOM。Windows のメモ帳などで UTF-8 と判定させ文字化けを防ぐ。 */
const UTF8_BOM = '\uFEFF';

export interface MarkdownFile {
  fileName: string;
  blob: Blob;
}

export type BuildResult = { error: string } | { result: MarkdownFile };

/**
 * 入力テキストを .md ファイルに変換する（SPEC §6.1）。
 * 空欄ならエラー、内容があれば Blob とタイムスタンプ名を返す。
 *
 * Windows での文字化け対策として、先頭に UTF-8 BOM を付与し、改行を CRLF に
 * 正規化する（BOM・CRLF はいずれも Markdown として正しく解釈される）。
 */
export function buildMarkdownFile(text: string, now?: Date): BuildResult {
  if (isBlank(text)) {
    return { error: EMPTY_TEXT_ERROR };
  }
  const normalized = text.replace(/\r\n|\r|\n/g, '\r\n');
  const blob = new Blob([UTF8_BOM + normalized], { type: 'text/markdown;charset=utf-8' });
  return { result: { blob, fileName: timestampFileName('md', now) } };
}
