# Refile.studio

ブラウザだけで完結するファイル変換ユーティリティ集。

## 特徴

- **プライバシー優先** — ファイルやテキストはすべて端末内で処理。サーバーへの送信なし。
- **インストール不要** — ブラウザだけで動く。
- **PWA 対応** — 初回ロード後はオフラインでも全ツールが利用可能。

## ツール一覧

| カテゴリ | ツール | 概要 |
|---------|--------|------|
| テキスト | Markdown | Markdown を編集し、`.md` または PDF として書き出し。ライブプレビュー付き。 |
| 画像 | 画像変換 | リサイズ・フォーマット変換（PNG / JPEG / WebP）、複数画像を1つの PDF にまとめる。 |
| PDF | PDF → 画像 | PDF の各ページを JPEG に変換。1ページは単体 DL、複数ページは ZIP。 |
| PDF | PDF 結合 | 複数の PDF を順番通りに1つに結合。 |
| PDF | PDF ページ操作 | ページのサムネイル確認・並べ替え・削除・抽出。 |

## 技術スタック

| 役割 | ライブラリ |
|------|-----------|
| UI フレームワーク | React 18 + TypeScript + Vite |
| ルーティング | react-router-dom（HashRouter） |
| PDF レンダリング | pdfjs-dist |
| PDF 生成・編集 | pdf-lib |
| Markdown → PDF | pdfmake + Noto Sans JP（動的フェッチ） |
| Markdown パース | markdown-it |
| ZIP 生成 | JSZip |
| PWA | vite-plugin-pwa（Workbox） |
| テスト | Vitest + @testing-library/react |

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動
npm run test     # ユニットテスト（Vitest）
npm run build    # 本番ビルド
npm run preview  # ビルド確認
```

## デプロイ

`main` ブランチへの push で GitHub Actions が自動的にビルドし、GitHub Pages へデプロイします。

**初回セットアップ**（GitHub リポジトリ側）:

1. **Settings → Pages → Source** を `GitHub Actions` に設定
2. `main` ブランチに push するとワークフローが起動

## プライバシーポリシー

このツールで扱うすべてのデータ（テキスト・画像・PDF）はブラウザ内のみで処理され、外部サーバーには一切送信されません。ページをリロードするとデータは消去されます。
