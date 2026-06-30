import type { ToolDefinition, ToolGroup } from './types';
import { MarkdownTool } from './md-to-pdf/MarkdownTool';
import { ImageTool } from './image/ImageTool';
import { HeicConvert } from './heic/HeicConvert';
import { PdfToImageTool } from './pdf-to-image/PdfToImageTool';
import { PdfMergeTool } from './pdf-merge/PdfMergeTool';
import { PdfPagesTool } from './pdf-pages/PdfPagesTool';
import { AudioConvert } from './audio/AudioConvert';
import type { IconName } from '../app/icons';

export interface ToolGroupDef {
  id: ToolGroup;
  label: string;
  icon: IconName;
}

/** サイドバーのカテゴリ定義（表示順）。 */
export const toolGroups: ToolGroupDef[] = [
  { id: 'text', label: 'テキストツール', icon: 'text' },
  { id: 'image', label: '画像ツール', icon: 'image' },
  { id: 'audio', label: 'オーディオツール', icon: 'audio' },
  { id: 'pdf', label: 'PDFツール', icon: 'pdf' },
];

/**
 * 登録済みツール一覧。サイドバー・ルートはここから生成される（SPEC §2.1-4）。
 */
export const tools: ToolDefinition[] = [
  {
    id: 'markdown',
    title: 'Markdown',
    description: 'Markdown を編集し、.md または PDF として書き出します。',
    icon: 'markdown',
    group: 'text',
    component: MarkdownTool,
  },
  {
    id: 'image',
    title: '画像変換',
    description: 'リサイズ・フォーマット変換、複数画像の PDF 化を行います。',
    icon: 'convert',
    group: 'image',
    component: ImageTool,
  },
  {
    id: 'heic',
    title: 'HEIC 変換',
    description: 'iPhone の HEIC / HEIF 写真を JPEG / PNG に変換します。',
    icon: 'heic',
    group: 'image',
    component: HeicConvert,
  },
  {
    id: 'audio',
    title: 'オーディオ変換',
    description: '音声ファイル（FLAC / WAV など）を MP3 / WAV に変換します。',
    icon: 'audio',
    group: 'audio',
    component: AudioConvert,
  },
  {
    id: 'pdf-to-image',
    title: 'PDF → 画像',
    description: 'PDF の各ページを JPEG 画像に変換します。',
    icon: 'pdf-to-image',
    group: 'pdf',
    component: PdfToImageTool,
  },
  {
    id: 'pdf-merge',
    title: 'PDF 結合',
    description: '複数の PDF を1つに結合します。',
    icon: 'merge',
    group: 'pdf',
    component: PdfMergeTool,
  },
  {
    id: 'pdf-pages',
    title: 'PDF ページ操作',
    description: 'PDF のページを並べ替え・削除・抽出します。',
    icon: 'pages',
    group: 'pdf',
    component: PdfPagesTool,
  },
];

export function getTool(id: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === id);
}

export function toolsByGroup(group: ToolGroup): ToolDefinition[] {
  return tools.filter((tool) => tool.group === group);
}
