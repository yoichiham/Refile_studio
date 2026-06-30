import { useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { useObjectUrl } from '../../lib/useObjectUrl';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { type HeicOutputFormat, validateHeicFile } from './logic';
import { convertHeic } from './convert';

const FORMATS: { value: HeicOutputFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

/** iPhone の HEIC/HEIF 写真を JPEG/PNG に変換する（heic2any）。 */
export function HeicConvert() {
  const [file, setFile] = useToolState<File | null>('heic.file', null);
  const [format, setFormat] = useToolState<HeicOutputFormat>('heic.format', 'jpeg');
  const [quality, setQuality] = useToolState('heic.quality', 92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [outBytes, setOutBytes] = useState(0);
  const [outUrl, setOutUrl] = useObjectUrl();

  const handleFiles = (files: File[]) => {
    const f = files[0];
    const err = validateHeicFile(f.name, f.size);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
    setOutBlob(null);
    setOutBytes(0);
    setOutUrl(null);
    setError('');
  };

  const clearFile = () => {
    setFile(null);
    setOutBlob(null);
    setOutBytes(0);
    setOutUrl(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { blob } = await convertHeic(file, format, quality / 100);
      setOutBlob(blob);
      setOutBytes(blob.size);
      setOutUrl(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : '変換に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (outBlob) downloadBlob(outBlob, timestampFileName(format === 'jpeg' ? 'jpg' : 'png'));
  };

  useToolHeader(
    {
      icon: <Icon name="heic" />,
      title: 'HEIC 変換',
      meta: file?.name,
      actions: (
        <button type="button" className="topbar-btn is-primary" onClick={download} disabled={!outBlob}>
          <Icon name="download" size={15} /> ダウンロード
        </button>
      ),
    },
    [file, outBlob, outBytes],
  );

  return (
    <div className="tool-content">
      <Dropzone
        accept=".heic,.heif"
        onFiles={handleFiles}
        icon="image"
        label="HEIC / HEIF ファイルをドラッグ&ドロップ、またはクリックして選択"
        hint="iPhone の写真（.heic / .heif）・最大50MB"
      />

      {file && (
        <>
          <p className="hint" style={{ marginTop: 12 }}>
            選択中: {file.name} ・ {formatBytes(file.size)}
          </p>
          <div className="btn-row">
            <button type="button" className="btn-ghost" onClick={clearFile}>
              選択したファイルを削除
            </button>
          </div>
        </>
      )}

      <h3 className="section-label" style={{ marginTop: 22 }}>
        出力フォーマット
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

      <div className="field" style={{ maxWidth: 360 }}>
        <div className="slider-row">
          <label className="field-label" style={{ margin: 0 }} htmlFor="heic-q">
            品質
          </label>
          <span className="slider-value">{format === 'png' ? '—' : `${quality}%`}</span>
        </div>
        <input
          id="heic-q"
          type="range"
          min={1}
          max={100}
          value={quality}
          disabled={format === 'png'}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </div>

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && <Loading label="変換中…（初回はライブラリの読み込みに時間がかかります）" />}

      {outUrl && !busy && (
        <>
          <h3 className="section-label" style={{ marginTop: 22 }}>
            変換後プレビュー（{formatBytes(outBytes)}）
          </h3>
          <div className="pdf-preview">
            <img src={outUrl} alt="変換後プレビュー" />
          </div>
        </>
      )}

      <div className="btn-row">
        <button type="button" className="btn" onClick={handleConvert} disabled={!file || busy}>
          変換する
        </button>
      </div>
    </div>
  );
}
