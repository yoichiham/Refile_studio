import { timestampFileName } from '../../lib/filename';
import { isBlank } from '../../lib/validation';

export const EMPTY_TEXT_ERROR = 'テキストを入力してください';

export interface MarkdownFile {
  fileName: string;
  blob: Blob;
}

export type BuildResult = { error: string } | { result: MarkdownFile };

/**
 * 入力テキストを .md ファイルに変換する（SPEC §6.1）。
 * 空欄ならエラー、内容があれば Blob とタイムスタンプ名を返す。
 */
export function buildMarkdownFile(text: string, now?: Date): BuildResult {
  if (isBlank(text)) {
    return { error: EMPTY_TEXT_ERROR };
  }
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return { result: { blob, fileName: timestampFileName('md', now) } };
}
