import { useMemo, useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob, downloadResults } from '../../lib/download';
import { rejectionMessage, partitionFiles } from '../../lib/fileIntake';
import { withExtension } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { describePageSelection, parsePageRange } from '../../lib/pageRange';
import { PDF_LOAD_ERROR } from '../../lib/pdfErrors';
import { validatePdfFile } from '../../lib/pdfValidation';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import {
  EMPTY_SELECTION_ERROR,
  type Rotation,
  applySelection,
  initialOrder,
  movePage,
  removeAt,
  rotateBy,
} from './logic';
import { type PageThumbnail, renderThumbnails } from './render';
import { type RotationMap, extractToSinglePdf, splitToPdfs } from './build';

export function PdfPagesTool() {
  const [file, setFile] = useToolState<File | null>('pages.file', null);
  const [pages, setPages] = useToolState<PageThumbnail[]>('pages.thumbs', []);
  const [order, setOrder] = useToolState<number[]>('pages.order', []);
  const [rotations, setRotations] = useToolState<RotationMap>('pages.rotations', {});
  const [selectRangeInput, setSelectRangeInput] = useState('');
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const thumbById = useMemo(() => {
    const map = new Map<number, string>();
    pages.forEach((p) => map.set(p.pageNumber, p.thumbnail));
    return map;
  }, [pages]);

  const selectRangeResult = pages.length > 0 ? parsePageRange(selectRangeInput, pages.length) : null;
  const selectRangeError = selectRangeResult && 'error' in selectRangeResult ? selectRangeResult.error : null;

  const handleFiles = async (files: File[]) => {
    const { valid, rejected } = partitionFiles(files, validatePdfFile);
    if (rejected.length > 0) setError(rejectionMessage(rejected));
    const f = valid[0];
    if (!f) return;
    setFile(f);
    setError('');
    setPages([]);
    setOrder([]);
    setRotations({});
    setSelectRangeInput('');
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

  const rotatePage = (pageNumber: number, delta: number) => {
    setRotations((prev) => ({
      ...prev,
      [pageNumber]: rotateBy((prev[pageNumber] ?? 0) as Rotation, delta),
    }));
  };

  const applyRangeSelection = () => {
    if (!selectRangeResult || 'error' in selectRangeResult) return;
    setOrder((o) => applySelection(o, selectRangeResult.pages));
    setSelectRangeInput('');
  };

  const restoreAllPages = () => {
    setOrder(initialOrder(pages.length));
    setRotations({});
    setError('');
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
        downloadBlob(await extractToSinglePdf(data, order, rotations), withExtension(file.name, 'pdf'));
      } else {
        const parts = await splitToPdfs(data, order, rotations);
        await downloadResults(parts, withExtension(file.name, 'zip'));
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
        selectedLabel={file ? `${file.name} ・ ${formatBytes(file.size)}` : undefined}
      />

      {loadingThumbs && <Loading label="ページを読み込み中…" />}

      {pages.length > 0 && (
        <div className="field" style={{ maxWidth: 320, marginTop: 16 }}>
          <label className="field-label" htmlFor="page-range-select">
            範囲でページを絞り込む
          </label>
          <input
            id="page-range-select"
            type="text"
            placeholder="例: 1-5,10,20-25"
            value={selectRangeInput}
            onChange={(e) => setSelectRangeInput(e.target.value)}
          />
          <p className="field-note" style={selectRangeError ? { color: 'var(--danger)' } : undefined}>
            {selectRangeError ??
              (selectRangeResult && 'pages' in selectRangeResult
                ? describePageSelection(selectRangeResult.pages, pages.length)
                : '')}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={applyRangeSelection}
            disabled={!selectRangeInput || !!selectRangeError}
          >
            この範囲だけ残す
          </button>
        </div>
      )}

      {order.length > 0 && (
        <div className="thumb-grid">
          {order.map((pageNumber, index) => (
            <div className="thumb" key={pageNumber}>
              <div className="thumb-img-wrap">
                <img
                  src={thumbById.get(pageNumber)}
                  alt={`ページ ${pageNumber}`}
                  style={
                    rotations[pageNumber] ? { transform: `rotate(${rotations[pageNumber]}deg)` } : undefined
                  }
                />
              </div>
              <div className="thumb-meta">
                {index + 1} 番目（元 p.{pageNumber}）
              </div>
              <div className="thumb-actions">
                <button type="button" aria-label="左に90度回転" onClick={() => rotatePage(pageNumber, -90)}>
                  ↺
                </button>
                <button type="button" aria-label="右に90度回転" onClick={() => rotatePage(pageNumber, 90)}>
                  ↻
                </button>
                <button
                  type="button"
                  aria-label="前へ移動"
                  onClick={() => setOrder((o) => movePage(o, index, -1))}
                  disabled={index === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="後ろへ移動"
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

      {pages.length > 0 && order.length === 0 && (
        <div className="empty-state">
          <p>すべてのページを削除しました。</p>
          <button type="button" className="btn btn-secondary" onClick={restoreAllPages}>
            全ページを復元
          </button>
        </div>
      )}

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && <Loading label="書き出し中…" />}

      {file && (
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
