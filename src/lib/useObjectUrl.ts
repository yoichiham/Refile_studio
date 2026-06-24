import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Blob のオブジェクト URL を管理する。差し替え時に前の URL を revoke し、
 * アンマウント時にも解放する（メモリリーク防止）。
 */
export function useObjectUrl(): readonly [string, (blob: Blob | null) => void] {
  const ref = useRef<string>('');
  const [url, setUrl] = useState('');

  const set = useCallback((blob: Blob | null) => {
    if (ref.current) URL.revokeObjectURL(ref.current);
    ref.current = blob ? URL.createObjectURL(blob) : '';
    setUrl(ref.current);
  }, []);

  useEffect(
    () => () => {
      if (ref.current) URL.revokeObjectURL(ref.current);
    },
    [],
  );

  return [url, set] as const;
}
