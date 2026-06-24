import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { PDF_LOAD_ERROR } from '../../lib/pdfErrors';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { EMPTY_SELECTION_ERROR, movePage, removeAt } from './logic';
import { type PageThumbnail, renderThumbnails } from './render';
import { extractToSinglePdf, splitToPdfs } from './build';

export function PdfPagesTool() {
  const [file, setFile] = useToolState<File | null>('pages.file', null);
  const [pages, setPages] = useToolState<PageThumbnail[]>('pages.thumbs', []);
  const [order, setOrder] = useToolState<number[]>('pages.order', []);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const thumbById = useMemo(() => {
    const map = new Map<number, string>();
    pages.forEach((p) => map.set(p.pageNumber, p.thumbnail));
    return map;
  }, [pages]);

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setError('');
    setPages([]);
    setOrder([]);
    setLoadingThumbs(true);
    try {
      const thumbs = await renderThumbnails(await f.arrayBuffer());
      setPages(thumbs);
      setOrder(thumbs.map((p) => p.pageNumber));
    } catch (e) {
      setError(e instanceof Error ? e.message : PDF_LOAD_ERROR);
      setFile(null);
    } finally {
      setLoadingThumbs(false);
    }
  };

  const runExport = async (mode: 'single' | 'split') => {
    if (!file) return;
    if (order.length === 0) {
      setError(EMPTY_SELECTION_ERROR);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const data = await file.arrayBuffer();
      if (mode === 'single') {
        downloadBlob(await extractToSinglePdf(data, order), timestampFileName('pdf'));
      } else {
        const parts = await splitToPdfs(data, order);
        const zip = new JSZip();
        parts.forEach((part) => zip.file(part.name, part.blob));
        downloadBlob(await zip.generateAsync({ type: 'blob' }), timestampFileName('zip'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : PDF_LOAD_ERROR);
    } finally {
      setBusy(false);
    }
  };

  useToolHeader({ icon: <Icon name="pages" />, title: 'PDF ページ操作', meta: file?.name }, [file]);

  return (
    <div className="tool-content">
      <Dropzone
        accept="application/pdf"
        onFiles={handleFiles}
        label="PDF をドラッグ&ドロップ、またはクリックして選択"
      />

      {loadingThumbs && <Loading label="ページを読み込み中…" />}

      {order.length > 0 && (
        <div className="thumb-grid">
          {order.map((pageNumber, index) => (
            <div className="thumb" key={pageNumber}>
              <img src={thumbById.get(pageNumber)} alt={`ページ ${pageNumber}`} />
              <div className="thumb-meta">
                {index + 1} 番目（元 p.{pageNumber}）
              </div>
              <div className="thumb-actions">
                <button type="button" onClick={() => setOrder((o) => movePage(o, index, -1))} disabled={index === 0}>
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setOrder((o) => movePage(o, index, 1))}
                  disabled={index === order.length - 1}
                >
                  →
                </button>
                <button type="button" onClick={() => setOrder((o) => removeAt(o, index))}>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && <Loading label="書き出し中…" />}

      {file && order.length > 0 && (
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => runExport('single')} disabled={busy}>
            1つの PDF にまとめる
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => runExport('split')} disabled={busy}>
            各ページを個別 PDF（ZIP）
          </button>
        </div>
      )}
    </div>
  );
}
