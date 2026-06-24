import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

const md = new MarkdownIt(); // 既定プリセット（table 有効）

type Run = string | { text: string; bold?: boolean; italics?: boolean; style?: string };
// pdfmake のコンテンツ要素。厳密な型より読みやすさ優先で緩めに扱う。
type Content = Record<string, unknown>;

/** インライントークンを pdfmake の run 配列に変換する。 */
function inlineRuns(token: Token | undefined): Run[] {
  const runs: Run[] = [];
  let bold = false;
  let italics = false;
  for (const child of token?.children ?? []) {
    switch (child.type) {
      case 'text':
        runs.push(
          bold || italics
            ? { text: child.content, ...(bold && { bold: true }), ...(italics && { italics: true }) }
            : child.content,
        );
        break;
      case 'code_inline':
        runs.push({ text: child.content, style: 'codeInline' });
        break;
      case 'strong_open':
        bold = true;
        break;
      case 'strong_close':
        bold = false;
        break;
      case 'em_open':
        italics = true;
        break;
      case 'em_close':
        italics = false;
        break;
      case 'softbreak':
      case 'hardbreak':
        runs.push('\n');
        break;
      default:
        // link 等は内側の text トークンで拾われる
        break;
    }
  }
  return runs.length > 0 ? runs : [''];
}

/** 単一プレーン run なら文字列に畳む。 */
function collapse(runs: Run[]): Run | Run[] {
  return runs.length === 1 && typeof runs[0] === 'string' ? runs[0] : runs;
}

/** リスト項目・表セル用。配列なら { text: [...] } で包む。 */
function asCell(runs: Run[]): Run | { text: Run[] } {
  const c = collapse(runs);
  return Array.isArray(c) ? { text: c } : c;
}

function findClose(tokens: Token[], start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i += 1) {
    if (tokens[i].type === open) depth += 1;
    else if (tokens[i].type === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}

function parseListItem(tokens: Token[], start: number): { item: unknown; next: number } {
  const closeIdx = findClose(tokens, start, 'list_item_open', 'list_item_close');
  const inner = tokens.slice(start + 1, closeIdx);
  // 単一段落のみの項目はインラインを直接セル化（ul: ['a'] の形にする）
  if (inner.length === 3 && inner[0].type === 'paragraph_open' && inner[1].type === 'inline') {
    return { item: asCell(inlineRuns(inner[1])), next: closeIdx + 1 };
  }
  return { item: { stack: parseBlocks(inner) }, next: closeIdx + 1 };
}

function parseTable(tokens: Token[], start: number): { content: Content; next: number } {
  const closeIdx = findClose(tokens, start, 'table_open', 'table_close');
  const body: unknown[][] = [];
  let row: unknown[] | null = null;
  for (let i = start + 1; i < closeIdx; i += 1) {
    const t = tokens[i];
    if (t.type === 'tr_open') {
      row = [];
    } else if (t.type === 'tr_close') {
      if (row) body.push(row);
      row = null;
    } else if (t.type === 'th_open' || t.type === 'td_open') {
      const runs = inlineRuns(tokens[i + 1]);
      if (t.type === 'th_open') {
        const c = collapse(runs);
        row?.push({ text: c, bold: true });
      } else {
        row?.push(asCell(runs));
      }
    }
  }
  const colCount = body[0]?.length ?? 1;
  return {
    content: {
      table: { headerRows: 1, widths: Array(colCount).fill('*'), body },
      layout: 'tableGrey',
      style: 'table',
    },
    next: closeIdx + 1,
  };
}

function parseBlocks(tokens: Token[]): Content[] {
  const content: Content[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    switch (t.type) {
      case 'heading_open':
        content.push({ text: collapse(inlineRuns(tokens[i + 1])), style: t.tag });
        i += 3;
        break;
      case 'paragraph_open':
        content.push({ text: collapse(inlineRuns(tokens[i + 1])), style: 'paragraph' });
        i += 3;
        break;
      case 'fence':
      case 'code_block':
        content.push({ text: t.content, style: 'code' });
        i += 1;
        break;
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const ordered = t.type === 'ordered_list_open';
        const closeType = ordered ? 'ordered_list_close' : 'bullet_list_close';
        const items: unknown[] = [];
        i += 1;
        while (i < tokens.length && tokens[i].type !== closeType) {
          if (tokens[i].type === 'list_item_open') {
            const { item, next } = parseListItem(tokens, i);
            items.push(item);
            i = next;
          } else {
            i += 1;
          }
        }
        i += 1; // close をスキップ
        content.push(ordered ? { ol: items, style: 'list' } : { ul: items, style: 'list' });
        break;
      }
      case 'table_open': {
        const { content: table, next } = parseTable(tokens, i);
        content.push(table);
        i = next;
        break;
      }
      case 'blockquote_open': {
        const closeIdx = findClose(tokens, i, 'blockquote_open', 'blockquote_close');
        content.push({
          stack: parseBlocks(tokens.slice(i + 1, closeIdx)),
          style: 'blockquote',
        });
        i = closeIdx + 1;
        break;
      }
      case 'hr':
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
          margin: [0, 6, 0, 6],
        });
        i += 1;
        break;
      default:
        i += 1;
        break;
    }
  }
  return content;
}

/** Markdown 文字列を pdfmake のコンテンツ配列へ変換する（SPEC §6.4 / §9-1）。 */
export function markdownToContent(markdown: string): Content[] {
  return parseBlocks(md.parse(markdown, {}));
}
