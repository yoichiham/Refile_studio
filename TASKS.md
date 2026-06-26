# TASKS.md — Refile.studio 実装計画

仕様は [SPEC.md](./SPEC.md) を参照。各項目の実装が完了したら `- [ ]` を `- [x]` にして DONE にする。
実装順序は「基盤（プロジェクト/ルーティング/レジストリ）→ 軽量ツール → 重量ツール → 仕上げ」。TDD（純粋ロジックは先にテスト）を基本とする。
※ Canvas/PDF レンダリング層は jsdom で自動テストが困難なため、ロジックを純粋関数に切り出してユニットテストし、描画は手動/結合で検証する。

---

## Phase 0：プロジェクト基盤

- [x] Vite + React + TypeScript プロジェクト作成
- [x] 依存追加（react-router-dom, pdfjs-dist, jszip, pdfmake, markdown-it, pdf-lib, vite-plugin-pwa, vitest, @testing-library/react）
- [x] vite.config の `base` を `'/<リポジトリ名>/'` に設定（GitHub Pages）
- [x] ESLint / Prettier / tsconfig（strict）設定
- [x] ディレクトリ構成作成（src/app, src/tools, src/lib）
- [x] HashRouter ＋ アプリ雛形（サイドバーレイアウト・トップ画面）
- [x] ツールレジストリ（ToolDefinition 型・registry.ts・サイドバー/ルート自動生成）

## Phase 1：共有ユーティリティ

- [x] ファイル名生成 `YYYYMMDD_HHMMSS` ＋テスト
- [x] Blob ダウンロードユーティリティ
- [x] 共通バリデーション（空文字/サイズ/形式判定）＋テスト
- [x] ドラッグ&ドロップ共通フック（`useDropzone`）＋テスト

## Phase 2：Markdown ツール（id: markdown）

- [x] 純粋ロジック（空欄判定・.md Blob生成・ファイル名）＋テスト
- [x] Markdown→pdfmake 定義マッピング（見出し/段落/リスト/表/コード/強調、未対応はプレーンへフォールバック）＋テスト
- [x] Noto Sans JP 動的ロード → vfs 登録
- [x] UI（テキストエリア・ライブプレビュー・EDIT/SPLIT/PREVIEW モード切替）
- [x] EXPORT ドロップダウン（.md / PDF）
- [x] COPY ボタン（コピー完了フィードバック 3 秒）
- [x] .md ファイルの D&D 読み込み（エディタ領域にドロップ → 内容＋ファイル名を反映）
- [ ] 受入：正常DL（.md / PDF） / 空欄エラー / .md D&D読み込み / 日本語文字化けなし（手動確認は未実施）

## Phase 3：画像変換ツール（id: image）

- [x] アスペクト比計算ロジック＋テスト
- [x] バリデーション（形式/サイズ範囲/10MB）＋テスト（境界値含む）
- [x] Canvas 描画・toBlob・GIF 1フレーム化
- [x] UI（タブ切替：リサイズ・変換 / 画像→PDF）
- [x] 画像→PDF：自動ページ向き（横長→A4横、縦長→A4縦）、余白20mm、比率維持
- [x] ドロップ後サムネイル一覧表示
- [ ] 受入：各エラー文言 / 境界値 / PNG・JPEG・WebP 出力 / 横長画像が横向きページになること（手動確認は未実施）

## Phase 4：PDF → 画像（id: pdf-to-image）

- [x] pdfjs worker 設定（`?url`）
- [x] ページ→canvas→JPEG 変換ロジック（品質切替: 150dpi/300dpi）
- [x] 1枚DL / 複数ページ ZIP（JSZip）
- [x] パスワード保護・破損のエラーハンドリング＋ロード表示
- [x] UI（アップロード・品質選択・進捗）
- [x] PDFの1ページ目サムネイル表示（`src/lib/pdfThumbnail.ts`）
- [ ] 受入：1枚/ZIP / 品質切替 / 規定エラー / 100ページ完走（手動確認は未実施）

## Phase 5：PDF 結合（id: pdf-merge）

- [x] pdf-lib で複数PDFを順に結合
- [x] パスワード保護・破損のエラーハンドリング
- [x] UI（複数PDFアップロード・並び順・D&D・エラー）
- [x] PDFの1ページ目サムネイル一覧表示
- [ ] 受入：連結順 / 1ファイル以下エラー / 規定エラー文言（手動確認は未実施）

## Phase 6：PDF ページ操作（id: pdf-pages）

- [x] pdfjs-dist でページサムネイル描画（Phase 4 基盤流用）
- [x] pdf-lib でページ並べ替え/削除/抽出 → 出力（複数抽出は ZIP）
- [x] UI（サムネイル一覧・選択/並べ替え・D&D・エラー）
- [ ] 受入：並べ替え/削除/抽出反映 / 複数抽出ZIP / 規定エラー（手動確認は未実施）

## Phase 7：UI ポリッシュ（v1.2）

- [x] ミニサイドバー（折りたたみ時 60px 幅・アイコンのみ表示）
- [x] サイドバー背景色（薄いグレー）
- [x] ナビゲーション項目のフォント太さ・色調整
- [x] COPY ボタンのコピー完了フィードバック（3秒間表示）
- [x] ファイル名入力欄の枠線表示
- [x] favicon（favicon.svg）・PWA manifest

## Phase 8：仕上げ・デプロイ

- [x] アプリ名・favicon・トップ説明
- [x] 全ツール共通のエラーハンドリング/ローディング統一
- [ ] 結合テスト・主要フロー手動検証（ネットワーク送信なしを DevTools で確認）
- [x] ビルド成功確認・preview 確認
- [x] PWA：vite-plugin-pwa 設定（manifest・Service Worker・autoUpdate・TTF runtime cache）
- [ ] オフライン動作確認（ネット切断で各ツールが動く）
- [x] GitHub Pages デプロイ（GitHub Actions、https://yoichiham.github.io/Refile_studio/）
- [x] README 作成・SPEC.md 更新

---

## 受入確認（リリース前チェック）

- [ ] markdown：正常DL（.md / PDF）/ 空欄エラー / .md D&D読み込み / 日本語文字化けなし
- [ ] image（リサイズ）：自動比率補完 / 3形式出力 / 非対応・範囲外・10MB超エラー / 10.0MB成功・10.01MBエラー
- [ ] image（画像→PDF）：枚数=ページ数 / 比率維持 / 横長→横向きページ / 0枚エラー
- [ ] pdf-to-image：1枚DL / 複数ZIP / 標準・高画質 / パスワード・破損エラー / 100ページ
- [ ] pdf-merge：連結順 / 1ファイル以下・パスワード・破損エラー
- [ ] pdf-pages：並べ替え・削除・抽出反映 / 複数抽出ZIP / 規定エラー
- [ ] GitHub Pages で `#/<tool-id>` 直アクセス・リロードが404にならない
- [ ] 全操作でファイル/テキストのネットワーク送信が発生しない
- [ ] 全ファイル系ツールでドラッグ&ドロップ投入できる
- [ ] オフライン（ネット切断）で初回ロード済みなら各ツールが動作する
