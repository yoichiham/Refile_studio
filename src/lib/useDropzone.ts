import { useCallback, useState, type DragEvent } from 'react';

interface DropzoneProps {
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

interface UseDropzoneResult {
  isOver: boolean;
  dropzoneProps: DropzoneProps;
}

/**
 * 全ツール共通のドラッグ&ドロップ受け取りフック（SPEC §7）。
 * ドロップされた File 配列を onFiles に渡す。クリック選択と併用する前提。
 */
export function useDropzone(onFiles: (files: File[]) => void): UseDropzoneResult {
  const [isOver, setIsOver] = useState(false);

  const onDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles],
  );

  return { isOver, dropzoneProps: { onDragOver, onDragLeave, onDrop } };
}
