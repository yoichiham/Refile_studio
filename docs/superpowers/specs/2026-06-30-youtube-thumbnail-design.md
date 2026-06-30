# YouTube サムネイル変換機能 — 設計（v1）

- 文書名：機能設計書
- 対象：既存「画像変換」ツール（`src/tools/image/`）の「リサイズ・変換」タブへの機能追加
- 作成日：2026-06-30
- 関連：[SPEC.md](../../../SPEC.md) §6.2、[TASKS.md](../../../TASKS.md) Phase 3

## 1. 背景・目的

YouTube サムネイルは仕様上「最大 2MB」「推奨解像度 1280×720」が定められている。現状の画像変換ツールは寸法・フォーマット・品質を個別に手動指定する必要があり、この用途では毎回同じ調整（1280×720 へのリサイズ＋ JPEG 品質を2MB以下まで下げる）を繰り返す手間がある。これをワンクリックのプリセットボタンとして提供する。

## 2. スコープ

**対象**
- 「リサイズ・変換」タブに「YouTube サムネイル（2MB）」ボタンを追加
- クリック時に以下を自動実行：
  1. 元画像を 1280×720（16:9）に**中央クロップ**（`object-fit: cover` 相当）
  2. JPEG 品質を二分探索し、出力が 2MB 以下になる最大品質を選択
  3. 既存のフォーム状態（幅/高さ/フォーマット/品質スライダー）を更新し、既存のプレビュー・ダウンロード機構をそのまま利用

**対象外（本機能では作らない）**
- 汎用の「目標ファイルサイズ指定」機能（KB/MB 任意入力） — YouTube プリセット専用とする
- レターボックス（余白付き）処理 — クロップ方式のみ
- PNG/WebP での 2MB 制約サポート — JPEG 固定（品質パラメータが有効なフォーマットのため）

## 3. アルゴリズム

### 3.1 クロップ矩形の計算（純粋関数・新規）

`src/tools/image/logic.ts` に追加：

```ts
export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** "Cover" 方式（object-fit: cover 相当）で、target の縦横比に合わせた中央クロップ矩形を求める。 */
export function coverCropRect(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
): CropRect {
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;
  if (srcRatio > targetRatio) {
    // 元画像が横長すぎる -> 左右をクロップ
    const sh = srcHeight;
    const sw = sh * targetRatio;
    return { sx: (srcWidth - sw) / 2, sy: 0, sw, sh };
  }
  // 元画像が縦長すぎる（または同比率） -> 上下をクロップ
  const sw = srcWidth;
  const sh = sw / targetRatio;
  return { sx: 0, sy: (srcHeight - sh) / 2, sw, sh };
}

export const YOUTUBE_THUMBNAIL = {
  width: 1280,
  height: 720,
  maxBytes: 2 * 1024 * 1024,
} as const;
```

### 3.2 品質の二分探索（純粋関数・新規）

```ts
/**
 * 二分探索でファイルサイズが maxBytes 以下になる最大の quality（0-1）を求める。
 * encode(quality) は実際のエンコードを行い生成バイト数を返す非同期関数（テスト時はモック注入）。
 */
export async function findQualityForMaxSize(
  encode: (quality: number) => Promise<number>,
  maxBytes: number,
  options: { minQuality?: number; maxQuality?: number; iterations?: number } = {},
): Promise<number> {
  const minQ = options.minQuality ?? 0.4;
  const maxQ = options.maxQuality ?? 0.95;
  const iterations = options.iterations ?? 6;
  let lo = minQ;
  let hi = maxQ;
  let best = minQ; // 最低品質でも超える場合のフォールバック
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const size = await encode(mid);
    if (size <= maxBytes) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}
```

- 品質範囲は 40%〜95%。1280×720 の JPEG が 2MB を超えるケースは実務上ほぼ発生しないが、安全側として下限 40% でのフォールバックを用意する。
- 6 回の二分探索で十分な精度（誤差 ±1% 程度）に収束する。

### 3.3 Canvas 描画の拡張（既存関数の拡張）

`src/lib/image.ts` の `drawToCanvas` に任意の `srcRect` パラメータを追加（後方互換）：

```ts
export function drawToCanvas(
  img: CanvasImageSource,
  width: number,
  height: number,
  background?: string,
  srcRect?: { sx: number; sy: number; sw: number; sh: number },
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas を初期化できませんでした');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  if (srcRect) {
    ctx.drawImage(img, srcRect.sx, srcRect.sy, srcRect.sw, srcRect.sh, 0, 0, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas;
}
```

## 4. UI / 状態管理（`ImageConvert.tsx`）

### 4.1 新規 state
- `cropRect: CropRect | null` — クロップモード中かどうかを表す。`null` なら通常のリサイズ動作。

### 4.2 既存ロジックへの組み込み
- メインのプレビュー再計算 `useEffect` で `drawToCanvas(img, w, h, bg, cropRect ?? undefined)` のように `cropRect` を渡す（依存配列にも追加）。
- 以下の操作で `cropRect` を `null` にリセット（通常のリサイズ挙動へ復帰）：
  - 幅/高さの手動編集（`onWidth` / `onHeight`）
  - パーセントプリセットのクリック（`applyPercent`）
  - 「元のサイズに戻す」
  - 新規画像アップロード・画像クリア（`clearImage`）

### 4.3 新規ハンドラ

```ts
const applyYoutubeThumbnail = async () => {
  if (!img) return;
  setYtBusy(true);
  const { width: tw, height: th, maxBytes } = YOUTUBE_THUMBNAIL;
  const rect = coverCropRect(img.naturalWidth, img.naturalHeight, tw, th);
  const canvas = drawToCanvas(img, tw, th, '#ffffff', rect);
  const q = await findQualityForMaxSize(
    async (quality) => (await canvasToBlob(canvas, 'image/jpeg', quality)).size,
    maxBytes,
  );
  setCropRect(rect);
  setFormat('jpeg');
  setWidthStr(String(tw));
  setHeightStr(String(th));
  setPercent(null);
  setQuality(Math.round(q * 100));
  setYtBusy(false);
};
```

- 探索処理は数十〜100ms程度で完了する見込みだが、誤操作防止のため簡易 busy フラグ（`ytBusy`）でボタンを一時無効化する。
- 探索後の state 更新により、既存のプレビュー再計算 `useEffect` が同条件で再実行され、最終的な `outBlob` / `outUrl` / `SizeCompare` 表示が確定する（二重エンコードになるが画像1枚・数百ms以内のため許容）。

### 4.4 UI配置
- 「プリセット」（パーセントボタン群）の下に新規ボタン「YouTube サムネイル（2MB）」を配置。
- ボタン直下に注記テキスト：「16:9以外の画像は中央を基準にクロップされます」
- ダウンロードファイル名は既存命名規則（`timestampFileName('jpg')` 相当、既存 `download()` 関数を流用）のまま変更しない。

## 5. テスト方針（TDD）

| 対象 | 種別 | 内容 |
|---|---|---|
| `coverCropRect` | ユニットテスト | 横長元画像（クロップ＝左右）／縦長元画像（クロップ＝上下）／同比率（クロップなし、全面使用）の3パターン |
| `findQualityForMaxSize` | ユニットテスト | モック `encode`（quality に対して単調増加するバイト数を返す関数）を注入し、二分探索が期待値に収束することを検証 |
| `drawToCanvas`（`srcRect` 拡張） | 手動確認 | Canvas 実描画は jsdom で困難なため、既存方針通り手動/結合で確認 |
| UI 統合（クリック→1280×720/JPEG/品質反映、クロップ解除条件） | 手動確認 | ブラウザで実画像を使い目視確認 |

## 6. エッジケース

- **元画像が 1280×720 より小さい場合**：仕様通りアップスケールする（YouTube 規定サイズを優先）。画質劣化はあり得るが、これは仕様として許容する。
- **2MB を切れない極端な画像**（理論上ほぼ発生しない）：最低品質 40% にフォールバックし、2MB をわずかに超える可能性を許容する（追加のエラー表示は行わない）。
- **フォーマットを手動で JPEG 以外に変更した場合**：`cropRect` は保持されるためクロップは継続するが、2MB 制約の保証は失われる（仕様として明記、追加のガードは設けない）。

## 7. ドキュメント更新（実装完了後）

- `SPEC.md` §6.2：YouTube サムネイルプリセットの仕様を追記
- `TASKS.md` Phase 3：チェックリスト項目を追加・完了マーク

## 8. 非対象・将来検討

- 汎用「目標ファイルサイズ」入力機能（KB/MB任意指定）は本設計の対象外。需要があれば別途設計する。
