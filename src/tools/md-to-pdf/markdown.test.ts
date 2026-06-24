import { describe, expect, it } from 'vitest';
import { markdownToContent } from './markdown';

describe('markdownToContent', () => {
  it('見出しをレベル別 style 付きテキストにする', () => {
    expect(markdownToContent('# 見出し1')).toContainEqual({ text: '見出し1', style: 'h1' });
    expect(markdownToContent('### 見出し3')).toContainEqual({ text: '見出し3', style: 'h3' });
  });

  it('段落の強調を bold / italics の run にする', () => {
    const content = markdownToContent('これは **太字** と *斜体*');
    const para = content.find((c) => (c as { style?: string }).style === 'paragraph');
    expect(para).toEqual({
      text: ['これは ', { text: '太字', bold: true }, ' と ', { text: '斜体', italics: true }],
      style: 'paragraph',
    });
  });

  it('箇条書きを ul にする', () => {
    expect(markdownToContent('- a\n- b')).toContainEqual({ ul: ['a', 'b'], style: 'list' });
  });

  it('番号付きリストを ol にする', () => {
    expect(markdownToContent('1. a\n2. b')).toContainEqual({ ol: ['a', 'b'], style: 'list' });
  });

  it('コードブロックを code スタイルにする', () => {
    expect(markdownToContent('```\nconst x = 1;\n```')).toContainEqual({
      text: 'const x = 1;\n',
      style: 'code',
    });
  });

  it('表を pdfmake table（ヘッダ太字）にする', () => {
    const content = markdownToContent('| A | B |\n| --- | --- |\n| 1 | 2 |');
    const table = content.find((c) => 'table' in (c as object)) as {
      table: { body: unknown[] };
    };
    expect(table.table.body).toEqual([
      [
        { text: 'A', bold: true },
        { text: 'B', bold: true },
      ],
      ['1', '2'],
    ]);
  });

  it('未対応記法を含んでも落ちず、内容を返す', () => {
    const content = markdownToContent('テキスト\n\n> 引用文');
    expect(content.length).toBeGreaterThan(0);
  });
});
