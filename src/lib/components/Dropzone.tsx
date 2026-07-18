import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { useDropzone } from '../useDropzone';
import { Icon, type IconName } from '../../app/icons';

interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  icon?: IconName;
  /** 選択済みファイルの表示名（例: "photo.heic ・ 2.3 MB"、"3 ファイル選択中"）。
   *  指定するとドロップエリア自体が選択状態の見た目に切り替わる。 */
  selectedLabel?: string;
}

/** 全ツール共通の D&D 兼クリック選択の入力エリア（SPEC §7）。 */
export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label = 'ファイルをドラッグ&ドロップ、またはクリックして選択',
  hint,
  icon = 'pdf',
  selectedLabel,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOver, dropzoneProps } = useDropzone(onFiles);

  const openPicker = () => inputRef.current?.click();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = ''; // 同じファイルを連続選択できるようリセット
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div
      className={`dropzone${isOver ? ' is-over' : ''}${selectedLabel ? ' has-file' : ''}`}
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      {...dropzoneProps}
    >
      <div className="dropzone-icon" aria-hidden>
        <Icon name={icon} size={30} />
      </div>
      {selectedLabel ? (
        <>
          <div className="dropzone-selected">{selectedLabel}</div>
          <div className="dropzone-hint">クリックまたはドラッグで変更</div>
        </>
      ) : (
        <>
          <div>{label}</div>
          {hint && <div className="dropzone-hint">{hint}</div>}
        </>
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
