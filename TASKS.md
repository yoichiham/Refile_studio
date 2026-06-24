# TASKS.md — Refile.studio 実装計画

仕様は [SPEC.md](./SPEC.md) を参照。各項目の実装が完了したら `- [ ]` を `- [x]` にして DONE にする。
実装順序は「基盤（プロジェクト/ルーティング/レジストリ）→ 軽量ツール → 重量ツール → 仕上げ」。TDD（純粋ロジックは先にテスト）を基本とする。
※ Canvas/PDF レンダリング層は jsdom で自動テストが困難なため、ロジックを純粋関数に切り出してユニットテストし、描画は手動/結合で検証する。

---

## Phase 0：プロジェクト基盤

- [x] Vite + React + TypeScript プロジェクト作成
- [x] 依存追加（react-router-dom, pdfjs-dist, jszip, pdfmake, markdown-it（または marked）, pdf-lib, vite-plugin-pwa, vitest, @testing-library/react）
- [x] vite.config の `base` を `'/<リポジトリ名>/'` に設定（GitHub Pages）
- [x] ESLint / Prettier / tsconfig（strict）設定
- [x] ディレクトリ構成作成（src/app, src/tools, src/lib）
- [x] HashRouter ＋ アプリ雛形（サイドバーレイアウト・トップ画面）
- [x] ツールレジストリ（ToolDefinition 型・registry.ts・サイドバー/ルート自動生成）

## Phase 1：共有ユーティリティ

- [x] ファイル名生成 `YYYYMMDD_HHMMSS` ＋テスト
- [x] Blob ダウンロードユーティリティ
- [x] 共通バリデーション（空文字/サイズ/形式判定）＋テスト
- [x] ドラッグ&ドロップ共通フック/コンポーネント（src/lib）＋テスト（各ファイルツールで利用）

## Phase 2：テキスト → .md（md-file）

- [x] 純粋ロジック（空欄判定・.md Blob生成・ファイル名）＋テスト
- [x] UI（テキストエリア・ダウンロード・エラー表示）
- [ ] 受入：正常DL / 空欄エラー / 10万文字（手動確認は未実施）

## Phase 3：画像リサイズ＆変換（image-convert）

- [x] アスペクト比計算ロジック＋テスト
- [x] バリデーション（形式/サイズ範囲/10MB）＋テスト（境界値含む）
- [x] Canvas 描画・toBlob・GIF 1フレーム化
- [x] UI（アップロード・幅高さ自動補完・フォーマット選択・エラー）
- [ ] 受入：各エラー文言 / 境界値 / PNG・JPEG・WebP 出力（境界値はユニットテスト済、UI手動確認は未実施）

## Phase 4：PDF → 画像（pdf-to-image）

- [x] pdfjs worker 設定（`?url`）
- [x] ページ→canvas→JPEG 変換ロジック（品質切替: 150dpi/300dpi）
- [x] 1枚DL / 複数ページ ZIP（JSZip）
- [x] パスワード保護・破損のエラーハンドリング＋ロード表示
- [x] UI（アップロード・品質選択・進捗）
- [ ] 受入：1枚/ZIP / 品質切替 / 規定エラー / 100ページ完走（手動確認は未実施）

## Phase 5：Markdown → PDF（md-to-pdf）

- [x] Markdown→pdfmake 定義マッピング（見出し/段落/リスト/表/コード/強調、未対応はプレーンへフォールバック）＋テスト
- [x] Noto Sans JP 動的ロード → vfs 登録
- [x] A4縦 / 余白20mm / 白黒スタイル / 自動改ページ設定
- [x] UI（テキストエリア・PDF DL・空欄エラー）
- [x] 受入：装飾 / 日本語 / テキスト選択可 / 改ページ / 空欄エラー

## Phase 6：画像 → PDF（image-to-pdf）(v1.1)

- [x] 画像正規化（WebP/GIF/BMP → Canvas → PNG/JPEG、GIF 1フレーム）＋テスト（Phase 3 基盤流用）
- [x] pdf-lib で A4縦・余白20mm・比率維持・1画像1ページ配置
- [x] UI（複数画像アップロード・並び順・D&D・エラー）
- [ ] 受入：枚数=ページ数 / 比率維持 / 0枚エラー（手動確認は未実施）

## Phase 7：PDF 結合（pdf-merge）(v1.1)

- [x] pdf-lib で複数PDFを順に結合
- [x] パスワード保護・破損のエラーハンドリング
- [x] UI（複数PDFアップロード・並び順・D&D・エラー）
- [ ] 受入：連結順 / 1ファイル以下エラー / 規定エラー文言（手動確認は未実施）

## Phase 8：PDF 分割・ページ操作（pdf-pages）(v1.1)

- [x] pdfjs-dist でページサムネイル描画（Phase 4 基盤流用）
- [x] pdf-lib でページ並べ替え/削除/抽出 → 出力（複数抽出は ZIP）
- [x] UI（サムネイル一覧・選択/並べ替え・D&D・エラー）
- [ ] 受入：並べ替え/削除/抽出反映 / 複数抽出ZIP / 規定エラー（手動確認は未実施）

## Phase 9：仕上げ

- [x] アプリ名・favicon・トップ説明（favicon.svg 作成・index.html meta 追加）
- [x] 全ツール共通のエラーハンドリング/ローディング統一（ErrorMessage / Loading コンポーネント統一済み）
- [ ] 結合テスト・主要フロー手動検証（ネットワーク送信なしを DevTools で確認）
- [x] ビルド成功確認・preview 確認
- [x] PWA：vite-plugin-pwa 設定（manifest・Service Worker・autoUpdate・TTF runtime cache）
- [ ] オフライン動作確認（ネット切断で各ツールが動く）
- [x] GitHub Pages デプロイ設定（.github/workflows/deploy.yml 作成）※**公開操作はユーザー対応待ち**
- [x] README 作成

---

## 受入確認（リリース前チェック）

- [ ] md-file：正常DL（内容一致）/ 空欄エラー / 10万文字
- [ ] image-convert：自動比率補完 / 3形式出力 / 非対応・範囲外・10MB超エラー / 10.0MB成功・10.01MBエラー
- [ ] pdf-to-image：1枚DL / 複数ZIP / 標準・高画質 / パスワード・破損エラー / 100ページ
- [ ] md-to-pdf：装飾適用 / 日本語文字化けなし / テキスト選択・検索可 / A4縦・余白20mm・自動改ページ / 空欄エラー
- [ ] GitHub Pages で `#/<tool-id>` 直アクセス・リロードが404にならない
- [ ] 全操作でファイル/テキストのネットワーク送信が発生しない
- [ ] image-to-pdf：枚数=ページ数 / 比率維持 / 0枚エラー
- [ ] pdf-merge：連結順 / 1ファイル以下・パスワード・破損エラー
- [ ] pdf-pages：並べ替え・削除・抽出反映 / 複数抽出ZIP / 規定エラー
- [ ] 全ファイル系ツールでドラッグ&ドロップ投入できる
- [ ] オフライン（ネット切断）で初回ロード済みなら各ツールが動作する
