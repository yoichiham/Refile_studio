import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { renderPdfFirstPage } from '../../lib/pdfThumbnail';
import { type Quality, QUALITY_OPTIONS } from './logic';
import { PDF_LOAD_ERROR, pdfToImages } from './convert';

export function PdfToImageTool() {
  const [file, setFile] = useToolState<File | null>('pdfimg.file', null);
  const [quality, setQuality] = useToolState<Quality>('pdfimg.quality', 'standard');
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setThumbSrc(null); return; }
    let cancelled = false;
    file
      .arrayBuffer()
      .then((data) => renderPdfFirstPage(data, 520))
      .then((url) => { if (!cancelled) setThumbSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [file]);

  const handleFiles = (files: File[]) => {
    setFile(files[0]);
    setError('');
  };

  const clearFile = () => {
    setFile(null);
    setThumbSrc(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setProgress(null);
    try {
      const data = await file.arrayBuffer();
      const images = await pdfToImages(data, quality, (current, total) =>
        setProgress({ current, total }),
      );
      if (images.length === 1) {
        downloadBlob(images[0].blob, timestampFileName('jpg'));
      } else {
        const zip = new JSZip();
        images.forEach((img) => zip.file(img.name, img.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, timestampFileName('zip'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : PDF_LOAD_ERROR);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  useToolHeader({ icon: <Icon name="pdf-to-image" />, title: 'PDF → 画像', meta: file?.name }, [file]);

  return (
    <div className="tool-content">
      <Dropzone
        accept="application/pdf"
        onFiles={handleFiles}
        label="PDF をドラッグ&ドロップ、またはクリックして選択"
      />

      {file && (
        <>
          <div className="selected-file">
            <span className="hint">選択中: {file.name}</span>
            <button type="button" className="btn-ghost" onClick={clearFile}>
              削除
            </button>
          </div>

          <div className="pdf-preview">
            {thumbSrc ? (
              <img src={thumbSrc} alt="1ページ目プレビュー" />
            ) : (
              <div className="preview-empty">プレビューを読み込み中…</div>
            )}
          </div>
        </>
      )}

      <div className="field" style={{ maxWidth: 320, marginTop: 16 }}>
        <label className="field-label" htmlFor="pdf-quality">
          画質
        </label>
        <select
          id="pdf-quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value as Quality)}
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && (
        <Loading
          label={progress ? `変換中… ${progress.current} / ${progress.total} ページ` : '読み込み中…'}
        />
      )}

      <div className="btn-row">
        <button type="button" className="btn" onClick={handleConvert} disabled={!file || busy}>
          画像に変換してダウンロード
        </button>
      </div>
    </div>
  );
}
