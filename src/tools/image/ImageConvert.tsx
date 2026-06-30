import { useEffect, useState } from 'react';
import { ImageUploadCard } from '../../lib/components/ImageUploadCard';
import { PreviewPane } from '../../lib/components/PreviewPane';
import { SizeCompare } from '../../lib/components/SizeCompare';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { canvasToBlob, drawToCanvas, loadImageElement } from '../../lib/image';
import { useObjectUrl } from '../../lib/useObjectUrl';
import { validateImageFile } from '../../lib/validation';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import {
  type CropRect,
  type OutputFormat,
  PERCENT_PRESETS,
  YOUTUBE_THUMBNAIL,
  coverCropRect,
  findQualityForMaxSize,
  fitDimension,
  formatFromMime,
  formatInfo,
  scaleDimensions,
  validateDimensions,
} from './logic';

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

/** リサイズとフォーマット変換を1画面で行う（単一画像）。 */
export function ImageConvert() {
  const [file, setFile] = useToolState<File | null>('image.file', null);
  const [widthStr, setWidthStr] = useToolState('image.w', '');
  const [heightStr, setHeightStr] = useToolState('image.h', '');
  const [lock, setLock] = useToolState('image.lock', true);
  const [percent, setPercent] = useToolState<number | null>('image.percent', 100);
  const [format, setFormat] = useToolState<OutputFormat>('image.format', 'png');
  const [quality, setQuality] = useToolState('image.quality', 92);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [outBytes, setOutBytes] = useState(0);
  const [error, setError] = useState('');
  const [origUrl, setOrigUrl] = useObjectUrl();
  const [outUrl, setOutUrl] = useObjectUrl();
  // YouTube サムネイル等のクロップモード。null なら通常のリサイズ動作
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [ytBusy, setYtBusy] = useState(false);

  const origBytes = file?.size ?? 0;
  const info = formatInfo(format);

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

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    const err = validateImageFile(f);
    if (err) {
      setError(err);
      return;
    }
    try {
      const image = await loadImageElement(f);
      setFile(f);
      setImg(image);
      setOrigUrl(f);
      setCropRect(null);
      setWidthStr(String(image.naturalWidth));
      setHeightStr(String(image.naturalHeight));
      setPercent(100);
      setFormat(formatFromMime(f.type));
      setError('');
    } catch {
      setError('画像を読み込めませんでした');
    }
  };

  // 設定変更のたびに出力（プレビュー＋サイズ）を再計算
  useEffect(() => {
    if (!img) return;
    const w = Number.parseInt(widthStr, 10);
    const h = Number.parseInt(heightStr, 10);
    const dimError = validateDimensions(w, h);
    if (dimError) {
      setError(dimError);
      return;
    }
    setError('');
    let cancelled = false;
    (async () => {
      const canvas = drawToCanvas(img, w, h, format === 'jpeg' ? '#ffffff' : undefined, cropRect ?? undefined);
      const blob = await canvasToBlob(canvas, info.mime, format === 'png' ? undefined : quality / 100);
      if (cancelled) return;
      setOutBlob(blob);
      setOutBytes(blob.size);
      setOutUrl(blob);
    })();
    return () => {
      cancelled = true;
    };
  }, [img, widthStr, heightStr, format, quality, info.mime, cropRect, setOutUrl]);

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
    } finally {
      setYtBusy(false);
    }
  };

  const download = () => {
    if (outBlob) downloadBlob(outBlob, timestampFileName(info.ext));
  };

  const clearImage = () => {
    setFile(null);
    setImg(null);
    setCropRect(null);
    setWidthStr('');
    setHeightStr('');
    setPercent(100);
    setOutBlob(null);
    setOutBytes(0);
    setOrigUrl(null);
    setOutUrl(null);
    setError('');
  };

  useToolHeader(
    {
      icon: <Icon name="convert" />,
      title: '画像変換',
      meta: file?.name,
      actions: (
        <button type="button" className="topbar-btn is-primary" onClick={download} disabled={!outBlob}>
          <Icon name="download" size={15} /> ダウンロード
        </button>
      ),
    },
    [file, outBytes, outBlob],
  );

  return (
    <>
      <ImageUploadCard
        fileName={file?.name}
        previewUrl={origUrl}
        metaLine={img ? `${img.naturalWidth} × ${img.naturalHeight}px ・ ${formatBytes(origBytes)}` : undefined}
        onFiles={handleFiles}
      />

      {file && (
        <div className="btn-row">
          <button type="button" className="btn-ghost" onClick={clearImage}>
            選択した画像を削除
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

            <div className="field">
              <div className="slider-row">
                <label className="field-label" style={{ margin: 0 }} htmlFor="img-q">
                  品質
                </label>
                <span className="slider-value">{format === 'png' ? '—' : `${quality}%`}</span>
              </div>
              <input
                id="img-q"
                type="range"
                min={1}
                max={100}
                value={quality}
                disabled={format === 'png'}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <div className="slider-scale">
                <span>低品質（小さいサイズ）</span>
                <span>高品質（大きいサイズ）</span>
              </div>
            </div>

            <ErrorMessage>{error || undefined}</ErrorMessage>

            {outBytes > 0 && !error && (
              <SizeCompare
                beforeBytes={origBytes}
                afterBytes={outBytes}
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
    </>
  );
}
