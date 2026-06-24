# CLAUDE.md — Refile.studio

このリポジトリで作業する際の指針。詳細仕様は [SPEC.md](./SPEC.md)、実装計画は [TASKS.md](./TASKS.md) を参照する。

## プロジェクト概要

ブラウザだけで完結するファイル変換ユーティリティ集（テキスト/画像/PDF/Markdown）。サーバー送信なし・データ永続化なし。個人・友人用、GitHub Pages 配信。詳細は SPEC.md §1。

## 絶対ルール

- 入力（テキスト/画像/PDF）を絶対にネットワーク送信しない。すべてブラウザ内で処理する。理由：プライバシーが本ツールの核（SPEC §2.1-1）。
- 入力データを永続化しない（localStorage 等に保存しない）。理由：同上、リロードで消えてよい設計（SPEC §2.1-2）。
- ツール追加はレジストリ経由のみ。ルート/サイドバーを個別ハードコードしない。理由：拡張容易性が設計目的（SPEC §2.1-4）。

## 言語・コミュニケーション

- 思考・推論・計画は英語。ユーザー向けの説明・質問・UI文言はすべて日本語。
- 曖昧な指示は推測せず確認する。冗長な前置きは省く。

## 技術スタック

- React + TypeScript + Vite / react-router(HashRouter) / pdfjs-dist + JSZip / pdfmake + Noto Sans JP / pdf-lib（PDF編集）/ vite-plugin-pwa / Canvas API。詳細は SPEC §2。
- **依存の落とし穴**：
  - **Vite base**：GitHub Pages 用に `base: '/<リポジトリ名>/'` 必須。未設定だとアセットが404になる。
  - **ルーター**：必ず HashRouter。BrowserRouter は Pages で直アクセス/リロード時に404になる。
  - **pdfjs worker**：`GlobalWorkerOptions.workerSrc` を Vite の `?url` インポートで設定。バージョン不一致でレンダリング失敗。
  - **Noto Sans JP**：全グリフ埋め込みはバンドル数MB級。動的 fetch → pdfmake vfs 登録で回避。
  - **canvas.toBlob**：品質引数は JPEG/WebP のみ有効、PNG は無視される。
  - **pdf-lib**：WebP/GIF/BMP は直接埋め込めない（embedPng/embedJpg のみ）。Canvas で PNG/JPEG に正規化してから埋め込む。
  - **PWA**：Service Worker / manifest の scope を base path（`/<リポジトリ名>/`）に整合させる。ズレるとオフライン時に読み込めない。

## 設計上の不変条件（破ってはならない）

1. ネットワーク送信なし・永続化なし（SPEC §2.1-1,2）。
2. GitHub Pages base path と HashRouter 前提、絶対パス直書き禁止（SPEC §2.1-3）。

## ディレクトリ構成方針

- `src/tools/<tool-id>/` に各ツールをまとめる（UI ＋ 純粋ロジックを分離）。
- `src/tools/registry.ts` にツール登録。サイドバー/ルートはここから生成。
- `src/lib/` に共有ユーティリティ（ファイル名生成・ダウンロード・バリデーション）。
- 肥大化したら機能単位で分割。

## 開発コマンド

```bash
npm install
npm run dev      # ローカル開発
npm run test     # Vitest
npm run build    # 本番ビルド
npm run preview  # ビルド確認
# デプロイは GitHub Pages（gh-pages or GitHub Actions）
```

## 進め方

- **TDD**：純粋ロジック（バリデーション・ファイル名生成・アスペクト比計算・Markdown→pdfmake変換）は先にテスト（Vitest）。Canvas/PDF レンダリング等 jsdom で困難な層はロジックを純粋関数に分離してテストし、描画は手動/結合で確認。
- **TASKS.md のチェック**：項目完了で `- [ ]` を `- [x]` にして DONE。
- 破壊的操作（大規模リファクタ・ファイル削除）は事前に方針説明し承認を得る。
- エラー対応は試行錯誤に頼らず、ログと該当ファイルを分析し根本原因を特定してから修正する。
