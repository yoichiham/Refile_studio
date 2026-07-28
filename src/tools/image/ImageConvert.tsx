import { useEffect, useState } from 'react';
import { ImageUploadCard } from '../../lib/components/ImageUploadCard';
import { PreviewPane } from '../../lib/components/PreviewPane';
import { ProgressBar } from '../../lib/components/ProgressBar';
import { SizeCompare } from '../../lib/components/SizeCompare';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { type BatchItemStatus, batchSummaryMessage, uniqueName } from '../../lib/batch';
import { downloadBlob } from '../../lib/download';
import { rejectionMessage, partitionFiles } from '../../lib/fileIntake';
import { timestampFileName, withExtension } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { canvasToBlob, drawToCanvas, loadImageElement } from '../../lib/image';
import { useObjectUrl } from '../../lib/useObjectUrl';
import { useBatchRun } from '../../lib/useBatchRun';
import { validateImageFile } from '../../lib/validation';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { type ImageConvertResult, convertLoadedImage } from './convert';
import {
  type BatchResizeSpec,
  type CropRect,
  type OutputFormat,
  MAX_IMAGE_BATCH,
  PERCENT_PRESETS,
  YOUTUBE_THUMBNAIL,
  batchTargetSize,
  coverCropRect,
  findQualityForMaxSize,
  fitDimension,
  formatFromMime,
  scaleDimensions,
  validateDimensions,
} from './logic';

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

type BatchResizeMode = 'percent' | 'longEdge';

const STATUS_LABELS: Record<BatchItemStatus, string> = {
  pending: '待機中',
  running: '変換中…',
  done: '完了',
  error: '失敗',
};

/** リサイズとフォーマット変換を1画面で行う。1枚は詳細設定つき、複数枚は一括変換。 */
export function ImageConvert() {
  const [files, setFiles] = useToolState<File[]>('image.files', []);
  const [widthStr, setWidthStr] = useToolState('image.w', '');
  const [heightStr, setHeightStr] = useToolState('image.h', '');
  const [lock, setLock] = useToolState('image.lock', true);
  const [percent, setPercent] = useToolState<number | null>('image.percent', 100);
  const [format, setFormat] = useToolState<OutputFormat>('image.format', 'png');
  const [quality, setQuality] = useToolState('image.quality', 92);
  const [batchResizeMode, setBatchResizeMode] = useToolState<BatchResizeMode>('image.batchResizeMode', 'percent');
  const [longEdgeStr, setLongEdgeStr] = useToolState('image.longEdge', '1600');

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [output, setOutput] = useState<ImageConvertResult | null>(null);
  const [error, setError] = useState('');
  const [origUrl, setOrigUrl] = useObjectUrl();
  const [outUrl, setOutUrl] = useObjectUrl();
  // YouTube サムネイル等のクロップモード。ツール切替後も保持し、戻った際に
  // 元画像が意図せず引き伸ばされる（クロップなしで再エンコードされる）事故を防ぐ
  const [cropRect, setCropRect] = useToolState<CropRect | null>('image.cropRect', null);
  const [ytBusy, setYtBusy] = useState(false);
  const batch = useBatchRun();

  // 1枚のときだけ従来の詳細設定UI（クロップ・YouTubeプリセット・プレビュー）を使う
  const file = files.length === 1 ? files[0] : null;
  const origBytes = file?.size ?? 0;

  // 再表示時（img はローカル）に保持された file から復元
  useEffect(() => {
    if (!file || img) return;
    let cancelled = false;
    (async () => {
      try {
        const image = await loadImageElement(file);
        if (!cancelled) {
          setImg(image);
          setOrigUrl(file);
        }
      } catch {
        if (!cancelled) setError('画像を読み込めませんでした');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, img, setOrigUrl]);

  const handleFiles = async (incoming: File[]) => {
    const { valid, rejected } = partitionFiles(incoming, validateImageFile);
    if (valid.length > MAX_IMAGE_BATCH) {
      setError(`一度に処理できるのは${MAX_IMAGE_BATCH}件までです`);
      return;
    }
    if (valid.length === 0) {
      setError(rejected.length > 0 ? rejectionMessage(rejected) : '');
      return;
    }
    // D&D は既存の選択への追加ではなく置換（同じ設定をファイル群に適用するため）
    setFiles(valid);
    batch.reset();
    setOutput(null);
    setOutUrl(null);

    if (valid.length === 1) {
      try {
        const image = await loadImageElement(valid[0]);
        setImg(image);
        setOrigUrl(valid[0]);
        setCropRect(null);
        setWidthStr(String(image.naturalWidth));
        setHeightStr(String(image.naturalHeight));
        setPercent(100);
        setFormat(formatFromMime(valid[0].type));
        setError(rejected.length > 0 ? rejectionMessage(rejected) : '');
      } catch {
        setError('画像を読み込めませんでした');
      }
    } else {
      setImg(null);
      setOrigUrl(null);
      setError(rejected.length > 0 ? rejectionMessage(rejected) : '');
    }
  };

  // 設定変更のたびに出力（プレビュー＋サイズ）を再計算（単一モードのみ）
  useEffect(() => {
    if (!img) return;
    const w = Number.parseInt(widthStr, 10);
    const h = Number.parseInt(heightStr, 10);
    const dimError = validateDimensions(w, h);
    if (dimError) {
      setError(dimError);
      // 寸法エラー中は古い変換結果を破棄する。outBlob を残したままだと
      // エラー表示中でも「ダウンロード」ボタンが有効なままになってしまう
      setOutput(null);
      setOutUrl(null);
      return;
    }
    setError('');
    let cancelled = false;
    (async () => {
      try {
        const result = await convertLoadedImage(img, {
          width: w,
          height: h,
          format,
          quality,
          cropRect: cropRect ?? undefined,
        });
        if (cancelled) return;
        setOutput(result);
        setOutUrl(result.blob);
      } catch {
        if (!cancelled) setError('画像の変換に失敗しました');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [img, widthStr, heightStr, format, quality, cropRect, setOutUrl]);

  const applyPercent = (p: number) => {
    if (!img) return;
    setCropRect(null);
    setPercent(p);
    const d = scaleDimensions(img.naturalWidth, img.naturalHeight, p);
    setWidthStr(String(d.width));
    setHeightStr(String(d.height));
  };

  const onWidth = (value: string) => {
    setCropRect(null);
    setPercent(null);
    setWidthStr(value);
    const w = Number.parseInt(value, 10);
    if (lock && img && Number.isFinite(w) && w > 0) {
      setHeightStr(String(fitDimension(img.naturalWidth, img.naturalHeight, w, null).height));
    }
  };

  const onHeight = (value: string) => {
    setCropRect(null);
    setPercent(null);
    setHeightStr(value);
    const h = Number.parseInt(value, 10);
    if (lock && img && Number.isFinite(h) && h > 0) {
      setWidthStr(String(fitDimension(img.naturalWidth, img.naturalHeight, null, h).width));
    }
  };

  // YouTube サムネイル（1280×720 中央クロップ・JPEG・2MB 以下）に一括設定
  const applyYoutubeThumbnail = async () => {
    if (!img || ytBusy) return;
    setYtBusy(true);
    try {
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
      setError('');
    } catch {
      setError('YouTube サムネイルを生成できませんでした');
    } finally {
      setYtBusy(false);
    }
  };

  const download = () => {
    if (file && output) downloadBlob(output.blob, withExtension(file.name, output.ext));
  };

  const clearFiles = () => {
    setFiles([]);
    setImg(null);
    setCropRect(null);
    setWidthStr('');
    setHeightStr('');
    setPercent(100);
    setOutput(null);
    setOrigUrl(null);
    setOutUrl(null);
    batch.reset();
    setError('');
  };

  const buildBatchResizeSpec = (): BatchResizeSpec => {
    if (batchResizeMode === 'longEdge') {
      const px = Number.parseInt(longEdgeStr, 10);
      return Number.isFinite(px) && px > 0 ? { kind: 'longEdge', px } : { kind: 'none' };
    }
    return percent != null ? { kind: 'percent', percent } : { kind: 'none' };
  };

  const handleConvertBatch = async () => {
    setError('');
    const taken = new Set<string>();
    const spec = buildBatchResizeSpec();
    await batch.run(
      files,
      async (f) => {
        const image = await loadImageElement(f);
        try {
          const { width, height } = batchTargetSize(image.naturalWidth, image.naturalHeight, spec);
          const result = await convertLoadedImage(image, { width, height, format, quality });
          return { name: uniqueName(taken, withExtension(f.name, result.ext)), blob: result.blob };
        } finally {
          // 早期解放（多数の画像を逐次処理する間、参照が積み上がらないように）
          image.src = '';
        }
      },
      { zipName: timestampFileName('zip') },
    );
  };

  useToolHeader(
    {
      icon: <Icon name="convert" />,
      title: '画像変換',
      meta: files.length === 1 ? files[0].name : files.length > 1 ? `${files.length} 枚` : undefined,
      actions:
        files.length <= 1 ? (
          <button type="button" className="topbar-btn is-primary" onClick={download} disabled={!output}>
            <Icon name="download" size={15} /> ダウンロード
          </button>
        ) : undefined,
    },
    [files, output],
  );

  return (
    <>
      <ImageUploadCard
        fileName={file?.name}
        previewUrl={origUrl}
        metaLine={img ? `${img.naturalWidth} × ${img.naturalHeight}px ・ ${formatBytes(origBytes)}` : undefined}
        multiple
        multipleLabel={files.length > 1 ? `${files.length} 枚選択中` : undefined}
        onFiles={handleFiles}
      />

      {files.length > 0 && (
        <div className="btn-row">
          <button type="button" className="btn-delete" onClick={clearFiles}>
            <Icon name="trash" size={14} /> 選択した画像を削除
          </button>
        </div>
      )}

      {img && (
        <div className="two-col">
          <div>
            <h3 className="section-label">リサイズ</h3>
            <div className="presets">
              {PERCENT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset${percent === p ? ' is-active' : ''}`}
                  onClick={() => applyPercent(p)}
                >
                  {p}%
                </button>
              ))}
            </div>

            <div className="preset-row">
              <button
                type="button"
                className={`preset preset-wide${cropRect ? ' is-active' : ''}`}
                onClick={applyYoutubeThumbnail}
                disabled={ytBusy}
              >
                {ytBusy ? '変換中…' : '▶ YouTube サムネイル（2MB）'}
              </button>
            </div>
            <p className="field-note">16:9 以外の画像は中央を基準にクロップされます。</p>

            <div className="row">
              <div className="field">
                <label className="field-label" htmlFor="img-w">
                  幅 (PX)
                </label>
                <input id="img-w" type="number" min={1} max={9999} value={widthStr} onChange={(e) => onWidth(e.target.value)} />
              </div>
              <button
                type="button"
                className="preset"
                onClick={() => setLock((v) => !v)}
                title="アスペクト比の固定"
                aria-label={lock ? 'アスペクト比を固定中（クリックで解除）' : 'アスペクト比の固定を解除中（クリックで固定）'}
                aria-pressed={lock}
                style={{ marginBottom: 2 }}
              >
                {lock ? '🔒' : '🔓'}
              </button>
              <div className="field">
                <label className="field-label" htmlFor="img-h">
                  高さ (PX)
                </label>
                <input id="img-h" type="number" min={1} max={9999} value={heightStr} onChange={(e) => onHeight(e.target.value)} />
              </div>
            </div>

            <button type="button" className="link-button" onClick={() => applyPercent(100)}>
              ↺ 元のサイズに戻す
            </button>

            <h3 className="section-label" style={{ marginTop: 22 }}>
              フォーマット
            </h3>
            <div className="segmented">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`seg${format === f.value ? ' is-active' : ''}`}
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {format === 'png' ? (
              <p className="field-note">PNG は可逆（ロスレス）形式のため、品質の指定はありません。</p>
            ) : (
              <div className="field">
                <div className="slider-row">
                  <label className="field-label" style={{ margin: 0 }} htmlFor="img-q">
                    品質
                  </label>
                  <span className="slider-value">{quality}%</span>
                </div>
                <input
                  id="img-q"
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
                <div className="slider-scale">
                  <span>低品質（小さいサイズ）</span>
                  <span>高品質（大きいサイズ）</span>
                </div>
              </div>
            )}

            <ErrorMessage>{error || undefined}</ErrorMessage>

            {output && !error && (
              <SizeCompare
                beforeBytes={origBytes}
                afterBytes={output.blob.size}
                beforeLabel="元のサイズ"
                afterLabel={`変換後 (${format.toUpperCase()})`}
                beforeDim={`${img.naturalWidth} × ${img.naturalHeight}px`}
                afterDim={`${widthStr} × ${heightStr}px`}
              />
            )}
          </div>

          <div>
            <h3 className="section-label">プレビュー</h3>
            <PreviewPane url={outUrl} />
          </div>
        </div>
      )}

      {files.length > 1 && (
        <>
          <h3 className="section-label">リサイズ（一括）</h3>
          <div className="segmented">
            <button
              type="button"
              className={`seg${batchResizeMode === 'percent' ? ' is-active' : ''}`}
              onClick={() => setBatchResizeMode('percent')}
            >
              パーセント指定
            </button>
            <button
              type="button"
              className={`seg${batchResizeMode === 'longEdge' ? ' is-active' : ''}`}
              onClick={() => setBatchResizeMode('longEdge')}
            >
              長辺を指定
            </button>
          </div>

          {batchResizeMode === 'percent' ? (
            <div className="presets">
              {PERCENT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset${percent === p ? ' is-active' : ''}`}
                  onClick={() => setPercent(p)}
                >
                  {p}%
                </button>
              ))}
            </div>
          ) : (
            <div className="field" style={{ maxWidth: 200 }}>
              <label className="field-label" htmlFor="batch-long-edge">
                長辺 (PX)
              </label>
              <input
                id="batch-long-edge"
                type="number"
                min={1}
                max={9999}
                value={longEdgeStr}
                onChange={(e) => setLongEdgeStr(e.target.value)}
              />
            </div>
          )}
          <p className="field-note">
            複数ファイルへの一括適用のため、縦横比を保つ指定のみ選べます（幅・高さの個別指定や
            YouTube サムネイルは、画像ごとに縦横比が異なると歪んでしまうため使えません）。元の
            長辺より大きい値を指定しても拡大はしません。
          </p>

          <h3 className="section-label" style={{ marginTop: 22 }}>
            フォーマット
          </h3>
          <div className="segmented">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`seg${format === f.value ? ' is-active' : ''}`}
                onClick={() => setFormat(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {format === 'png' ? (
            <p className="field-note">PNG は可逆（ロスレス）形式のため、品質の指定はありません。</p>
          ) : (
            <div className="field" style={{ maxWidth: 360 }}>
              <div className="slider-row">
                <label className="field-label" style={{ margin: 0 }} htmlFor="batch-q">
                  品質
                </label>
                <span className="slider-value">{quality}%</span>
              </div>
              <input
                id="batch-q"
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>
          )}

          <ErrorMessage>{error || undefined}</ErrorMessage>

          <ul className="file-list">
            {files.map((f, index) => (
              <li key={`${f.name}-${index}`}>
                <span className="file-order">{index + 1}.</span>
                <span className="file-name">{f.name}</span>
                <span className={`batch-status is-${batch.statuses[index] ?? 'pending'}`}>
                  {STATUS_LABELS[batch.statuses[index] ?? 'pending']}
                </span>
              </li>
            ))}
          </ul>

          {batch.failures.length > 0 && !batch.busy && (
            <ErrorMessage tone="warn">
              {batchSummaryMessage(files.length - batch.failures.length, batch.failures.length)}
            </ErrorMessage>
          )}

          <div className="btn-row">
            <button type="button" className="btn" onClick={handleConvertBatch} disabled={batch.busy}>
              変換してダウンロード
            </button>
            {batch.busy && (
              <button type="button" className="btn btn-secondary" onClick={batch.cancel}>
                中止
              </button>
            )}
          </div>

          {batch.progress && (
            <ProgressBar
              done={batch.progress.done}
              total={batch.progress.total}
              label={`変換中… ${batch.progress.done} / ${batch.progress.total} 件（${batch.progress.currentName}）`}
            />
          )}
        </>
      )}
    </>
  );
}
