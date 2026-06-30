# オーディオ変換 ＆ HEIC 変換 — 設計（v1）

- 文書名：機能設計書
- 対象：新規ツール2種を Refile.studio に追加
- 作成日：2026-06-30
- 関連：[SPEC.md](../../../SPEC.md)、[TASKS.md](../../../TASKS.md)

## 1. 背景・目的

1. **オーディオ変換**：FLAC など可逆音源を MP3 等の汎用形式へ変換したい需要。サーバーに上げずブラウザ内で完結させる。
2. **HEIC 変換**：iPhone の HEIC/HEIF 写真を、共有しやすい JPEG/PNG に変換したい需要。

いずれも本ツールの不変条件（ネットワーク送信なし・永続化なし）を守り、ブラウザ内で処理する。

## 2. 技術選定と制約

### 2.1 オーディオ変換：Web Audio API + lamejs（採用）

- **デコード**：`AudioContext.decodeAudioData(arrayBuffer)` でブラウザ内蔵デコーダを使用。対応形式はブラウザ依存（Chrome/Edge/Firefox は FLAC/WAV/MP3/AAC 等を広くデコード。**Safari は FLAC をデコードできない**）。
- **MP3 エンコード**：`@breezystack/lamejs`（lamejs 維持フォーク、約100KB、TypeScript型付き）。API：
  ```ts
  const enc = new Mp3Encoder(channels, sampleRate, kbps);
  const buf = enc.encodeBuffer(leftInt16, rightInt16?); // Uint8Array
  const end = enc.flush();
  ```
- **WAV エンコード**：ライブラリ不要。PCM（Float32）→ 16bit PCM → RIFF/WAVE ヘッダ付与の純粋関数で実装（テスト可能）。
- **却下：ffmpeg.wasm** — マルチスレッド版は `SharedArrayBuffer`（COOP/COEP ヘッダ）が必要だが **GitHub Pages はカスタムヘッダ不可**。シングルスレッド版はコア約25MB でオフライン不可、軽量設計と衝突するため不採用。

### 2.2 HEIC 変換：heic2any（採用）

- `heic2any({ blob, toType, quality })` で libheif（WASM、約1.5MB）を用いてデコード → JPEG/PNG Blob を返す。API：
  ```ts
  const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 }); // Blob | Blob[]
  ```
- 入力 MIME（`image/heic`/`image/heif`）は OS により空になることがあるため、**拡張子（.heic/.heif）でバリデーション**する。

### 2.3 共通：動的 import

両ライブラリとも各ツールのコンポーネント／変換モジュール内で `await import(...)` による動的 import とし、メインバンドルに含めない（既存の pdf-lib と同方針）。

## 3. ツール構成

| ツールID | タイトル | グループ | アイコン |
|---|---|---|---|
| `audio` | オーディオ変換 | `audio`（新設カテゴリ「オーディオツール」） | `audio`（新規） |
| `heic` | HEIC 変換 | `image` | `heic`（新規） |

レジストリ（`src/tools/registry.tsx`）へ登録。サイドバー・ルートは自動生成（不変条件 §2.1-4）。新カテゴリ `audio` を `toolGroups` に追加。

## 4. オーディオ変換（id: audio）

### 4.1 入出力
- 入力：音声ファイル1つ（D&D／クリック選択）。受付は拡張子 `.flac .wav .mp3 .m4a .aac .ogg .oga .opus .weba` を許可（実際にデコードできるかはブラウザ依存）。最大サイズ：100MB。
- 出力：
  - **MP3**（lamejs）：ビットレート選択（128 / 192 / 320 kbps）
  - **WAV**（純粋関数）：非圧縮 16bit PCM
- ファイル名：`YYYYMMDD_HHMMSS.mp3` / `.wav`。

### 4.2 処理フロー
1. ファイルを ArrayBuffer 化。
2. `decodeAudioData` で AudioBuffer を得る（失敗時：「このファイル形式はお使いのブラウザでデコードできませんでした」）。
3. 出力形式に応じて：
   - WAV：`encodeWav(channels, sampleRate)` でバイト列生成。
   - MP3：各チャンネルを Float32→Int16 変換し、lamejs で 1152 サンプルずつエンコード。
4. Blob をダウンロード。長尺はロード表示でブロック。

### 4.3 純粋ロジック（`src/tools/audio/logic.ts`、TDD 対象）
- `floatTo16BitPCM(input: Float32Array): Int16Array` — クランプ＋スケール（-1..1 → -32768..32767）。
- `encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array` — RIFF/WAVE ヘッダ（44バイト）＋インターリーブ 16bit PCM。チャンネル数・サンプルレート・データ長をヘッダに正しく書く。
- `audioFormatInfo(format)` → `{ mime, ext }`（mp3 / wav）。
- `MP3_BITRATES` / `AUDIO_INPUT_EXTENSIONS` 定数、`validateAudioFile(name, size)` → 日本語エラー or null。

### 4.4 ライブラリ層（`src/tools/audio/encode.ts`、手動確認）
- `decodeAudio(file): Promise<AudioBuffer>`（Web Audio）。
- `encodeMp3(buffer, kbps): Uint8Array`（lamejs 動的 import、`floatTo16BitPCM` を利用）。

## 5. HEIC 変換（id: heic）

### 5.1 入出力
- 入力：HEIC/HEIF ファイル1つ。拡張子 `.heic .heif` を許可（MIME は不問）。最大 50MB。
- 出力：**JPEG**（品質スライダー 1-100%）または **PNG**。
- ファイル名：`YYYYMMDD_HHMMSS.jpg` / `.png`。

### 5.2 処理フロー
1. 拡張子バリデーション。
2. `heic2any({ blob: file, toType, quality })` を動的 import で実行（複数画像が返る場合は先頭を採用）。
3. 変換後 Blob をプレビュー表示＋ダウンロード。失敗時：「HEIC ファイルを変換できませんでした」。

### 5.3 純粋ロジック（`src/tools/heic/logic.ts`、TDD 対象）
- `heicOutputInfo(format)` → `{ mime, ext }`（jpeg / png）。
- `HEIC_EXTENSIONS` 定数、`validateHeicFile(name, size)` → 日本語エラー or null（拡張子・サイズ判定）。

### 5.4 ライブラリ層（`src/tools/heic/convert.ts`、手動確認）
- `convertHeic(file, format, quality): Promise<Blob>`（heic2any 動的 import）。

## 6. UI/UX

- 既存ツールと同じレイアウト（`useToolHeader` でトップバー、`useDropzone`／`Dropzone` で D&D、`ErrorMessage`／`Loading` 共通利用）。
- オーディオ：ファイル選択後にメタ情報（推定なし）と出力形式（MP3/WAV）＋ MP3 ビットレート選択、変換ボタン。
- HEIC：ファイル選択後に出力形式（JPEG/PNG）＋ JPEG 品質スライダー、変換ボタン、変換後プレビュー。
- 両ツールに削除ボタン（選択クリア）。

## 7. テスト方針（TDD）

| 対象 | 種別 | 内容 |
|---|---|---|
| `floatTo16BitPCM` | ユニット | 0→0、1→32767、-1→-32768、範囲外クランプ |
| `encodeWav` | ユニット | ヘッダ（"RIFF"/"WAVE"/"fmt "/"data"）・チャンネル数・サンプルレート・byte長・全体長が正しい |
| `audioFormatInfo` / `validateAudioFile` | ユニット | mime/ext、拡張子許可・サイズ超過エラー |
| `heicOutputInfo` / `validateHeicFile` | ユニット | mime/ext、.heic/.heif 許可・非対応拡張子・サイズ超過 |
| デコード／lamejs／heic2any | 手動 | jsdom 不可。ブラウザ実機で確認（Web Audio・WASM） |

## 8. エッジケース

- **Safari で FLAC**：`decodeAudioData` が失敗するため §4.2 のエラーを表示（仕様として明記）。Chrome/Edge/Firefox を推奨ブラウザとする。
- **HEIC のライブフォト（複数像）**：heic2any が配列を返す場合は先頭画像のみ採用。
- **大容量音源**：デコードでメモリを使うため最大 100MB に制限。
- **WASM 初回ロード**：heic2any/libheif の初回ロードに時間がかかるためロード表示でカバー。オフライン時は動的 import 済みなら動作、未ロードなら不可（PWA precache 対象外）。

## 9. ドキュメント更新（実装完了後）

- `SPEC.md`：§1.1 スコープに2ツール追加、§6 に機能仕様、§2 に依存追記、非機能要件にブラウザ依存（Safari FLAC 非対応）明記。
- `TASKS.md`：新規 Phase を追加し実装項目を記録。
- `README.md`：ツール一覧に2行追加。
- `CLAUDE.md`：技術スタック・依存の落とし穴（Safari FLAC、GitHub Pages の COOP/COEP 不可、拡張子バリデーション）を追記。

## 10. 非対象・将来検討

- 音声の複数ファイル一括変換、トリミング、音量正規化。
- HEIC の複数ファイル一括（ZIP）変換（今回は単一ファイル）。
- AAC/M4A への出力エンコード（lamejs は MP3 のみ。必要なら別途）。
