import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { useDropzone } from '../useDropzone';

interface ImageUploadCardProps {
  fileName?: string;
  previewUrl?: string;
  metaLine?: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

/** スクショ風の画像アップロード枠（D&D ＋ クリック、選択後はサムネイル＋メタ表示）。 */
export function ImageUploadCard({
  fileName,
  previewUrl,
  metaLine,
  accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp',
  multiple = false,
  onFiles,
}: ImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOver, dropzoneProps } = useDropzone(onFiles);
  const open = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      className={`upload-card${isOver ? ' is-over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={handleKeyDown}
      {...dropzoneProps}
    >
      {previewUrl && fileName ? (
        <>
          <img className="upload-thumb" src={previewUrl} alt="" />
          <div className="upload-name">{fileName}</div>
          {metaLine && <div className="upload-meta">{metaLine}</div>}
          <div className="upload-hint">クリックまたはドラッグで画像を変更</div>
        </>
      ) : (
        <div className="upload-empty">
          <div className="upload-empty-icon" aria-hidden>
            🖼️
          </div>
          <div>画像をドラッグ&ドロップ、またはクリックして選択{multiple ? '（複数可）' : ''}</div>
          <div className="upload-hint">PNG / JPEG / WebP / GIF / BMP（最大10MB）</div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={handleChange}
      />
    </div>
  );
}
