import { markdownToContent } from './markdown';

/** mm → pt（pdfmake の単位） */
const MM = 72 / 25.4;
const MARGIN = 20 * MM; // 上下左右 20mm（SPEC §6.4）

/** 表の罫線を薄いグレーにするレイアウト。createPdf の第2引数で渡す。 */
export const tableLayouts = {
  tableGrey: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#cccccc',
    vLineColor: () => '#cccccc',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
};

/** A4縦・余白20mm・白黒基調のシンプルな文書定義を作る（SPEC §6.4）。 */
export function buildDocDefinition(markdown: string): Record<string, unknown> {
  return {
    pageSize: 'A4',
    pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
    defaultStyle: { font: 'NotoSansJP', fontSize: 11, lineHeight: 1.4, color: '#1a1a1a' },
    content: markdownToContent(markdown),
    styles: {
      h1: { fontSize: 22, bold: true, margin: [0, 14, 0, 8] },
      h2: { fontSize: 18, bold: true, margin: [0, 12, 0, 6] },
      h3: { fontSize: 15, bold: true, margin: [0, 10, 0, 5] },
      h4: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] },
      h5: { fontSize: 12, bold: true, margin: [0, 6, 0, 3] },
      h6: { fontSize: 11, bold: true, color: '#555555', margin: [0, 6, 0, 3] },
      paragraph: { margin: [0, 0, 0, 8] },
      list: { margin: [0, 0, 0, 8] },
      table: { margin: [0, 4, 0, 10] },
      code: {
        fontSize: 10,
        color: '#222222',
        background: '#f4f4f5',
        preserveLeadingSpaces: true,
        margin: [0, 4, 0, 10],
      },
      codeInline: { background: '#f4f4f5', color: '#b3261e' },
      blockquote: { color: '#555555', italics: true, margin: [12, 0, 0, 8] },
    },
  };
}
