import { useEffect, useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadResults } from '../../lib/download';
import { rejectionMessage, partitionFiles } from '../../lib/fileIntake';
import { withExtension } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { validatePdfFile } from '../../lib/pdfValidation';
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
  const [thumbError, setThumbError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setThumbSrc(null); setThumbError(''); return; }
    let cancelled = false;
    setThumbError('');
    file
      .arrayBuffer()
      .then((data) => renderPdfFirstPage(data, 520))
      .then((url) => { if (!cancelled) setThumbSrc(url); })
      .catch((e: unknown) => {
        if (!cancelled) setThumbError(e instanceof Error ? e.message : PDF_LOAD_ERROR);
      });
    return () => { cancelled = true; };
  }, [file]);

  const handleFiles = (files: File[]) => {
    const { valid, rejected } = partitionFiles(files, validatePdfFile);
    setError(rejected.length > 0 ? rejectionMessage(rejected) : '');
    if (valid.length > 0) setFile(valid[0]);
  };

  const clearFile = () => {
    setFile(null);
    setThumbSrc(null);
    setThumbError('');
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
      // 1ページのみの場合は元PDF名ベースの名前にする（ページ番号名はZIP内でのみ使う）
      const results =
        images.length === 1 ? [{ ...images[0], name: withExtension(file.name, 'jpg') }] : images;
      await downloadResults(results, withExtension(file.name, 'zip'));
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
        selectedLabel={file ? `${file.name} ・ ${formatBytes(file.size)}` : undefined}
      />

      {file && (
        <>
          <div className="selected-file">
            <button type="button" className="btn-delete" onClick={clearFile}>
              <Icon name="trash" size={14} /> 削除
            </button>
          </div>

          <div className="pdf-preview">
            {thumbError ? (
              <div className="preview-empty">{thumbError}</div>
            ) : thumbSrc ? (
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
