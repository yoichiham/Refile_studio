import { useEffect, useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { PDF_LOAD_ERROR } from '../../lib/pdfErrors';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { renderPdfFirstPage } from '../../lib/pdfThumbnail';
import { validateMergeInput } from './logic';
import { mergePdfs } from './merge';

function PdfThumb({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    file
      .arrayBuffer()
      .then((data) => renderPdfFirstPage(data))
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [file]);
  return src
    ? <img src={src} className="file-thumb" alt="" />
    : <span className="file-thumb-placeholder" />;
}

export function PdfMergeTool() {
  const [files, setFiles] = useToolState<File[]>('merge.files', []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (incoming: File[]) => {
    setError('');
    setFiles((prev) => [...prev, ...incoming]);
  };

  const move = (index: number, delta: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleMerge = async () => {
    const inputError = validateMergeInput(files.length);
    if (inputError) {
      setError(inputError);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const blob = await mergePdfs(files);
      downloadBlob(blob, timestampFileName('pdf'));
    } catch (e) {
      setError(e instanceof Error ? e.message : PDF_LOAD_ERROR);
    } finally {
      setBusy(false);
    }
  };

  useToolHeader(
    { icon: <Icon name="merge" />, title: 'PDF 結合', meta: files.length ? `${files.length} ファイル` : undefined },
    [files.length],
  );

  return (
    <div className="tool-content">
      <Dropzone
        accept="application/pdf"
        multiple
        onFiles={handleFiles}
        label="PDF をドラッグ&ドロップ、またはクリックして選択（複数可）"
      />

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <PdfThumb file={file} />
              <span className="file-order">{index + 1}.</span>
              <span className="file-name">{file.name}</span>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1}>
                ↓
              </button>
              <button type="button" className="btn-ghost" onClick={() => remove(index)}>
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && <Loading label="結合中…" />}

      <div className="btn-row">
        <button type="button" className="btn" onClick={handleMerge} disabled={busy}>
          結合してダウンロード
        </button>
      </div>
    </div>
  );
}
