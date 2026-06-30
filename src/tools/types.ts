import type { ComponentType } from 'react';
import type { IconName } from '../app/icons';

/** サイドバーのカテゴリ。 */
export type ToolGroup = 'text' | 'image' | 'pdf' | 'audio';

/**
 * ツール登録の型。サイドバーとルーティングはこの定義から自動生成される。
 * 新ツールはコンポーネントを作り、registry.tsx の配列に1エントリ追加するだけで増やせる。
 */
export interface ToolDefinition {
  /** URL スラッグ。`#/<id>` になる（例: "md-file"） */
  id: string;
  /** サイドバー表示名（日本語） */
  title: string;
  /** ツール概要（日本語） */
  description: string;
  /** サイドバー用アイコン（icons.tsx のキー） */
  icon: IconName;
  /** 所属カテゴリ */
  group: ToolGroup;
  /** ツール本体コンポーネント */
  component: ComponentType;
}
