import { useEffect, useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { timestampFileName } from '../../lib/filename';
import { validateImageFile } from '../../lib/validation';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { NO_IMAGES_ERROR } from '../image-to-pdf/logic';
import { imagesToPdf } from '../image-to-pdf/build';

function ImageThumb({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return <span className="file-thumb-placeholder" />;
  return <img src={url} className="file-thumb" alt="" />;
}

/** 複数画像を1つの PDF にまとめる（画像変換ツールの「画像 → PDF」モード）。 */
export function ImageToPdfSection() {
  const [files, setFiles] = useToolState<File[]>('image.pdfFiles', []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (incoming: File[]) => {
    const valid: File[] = [];
    let firstError = '';
    for (const file of incoming) {
      const err = validateImageFile(file);
      if (err) firstError ||= err;
      else valid.push(file);
    }
    setError(firstError);
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
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

  const handleConvert = async () => {
    if (files.length === 0) {
      setError(NO_IMAGES_ERROR);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const blob = await imagesToPdf(files);
      downloadBlob(blob, timestampFileName('pdf'));
    } catch {
      setError('PDF の生成に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  useToolHeader(
    { icon: <Icon name="image-to-pdf" />, title: '画像 → PDF', meta: files.length ? `${files.length} 枚` : undefined },
    [files.length],
  );

  return (
    <>
      <Dropzone
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        multiple
        onFiles={handleFiles}
        icon="image"
        label="画像をドラッグ&ドロップ、またはクリックして選択（複数可）"
        hint="PNG / JPEG / WebP / GIF / BMP（各最大10MB）。1画像=1ページ・A4縦"
      />

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <ImageThumb file={file} />
              <span className="file-order">{index + 1}.</span>
              <span className="file-name">{file.name}</span>
              <button type="button" aria-label="上へ移動" onClick={() => move(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                aria-label="下へ移動"
                onClick={() => move(index, 1)}
                disabled={index === files.length - 1}
              >
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

      {busy && <Loading label="PDF を生成中…" />}

      <div className="btn-row">
        <button type="button" className="btn" onClick={handleConvert} disabled={files.length === 0 || busy}>
          PDF にまとめてダウンロード
        </button>
      </div>
    </>
  );
}
