import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDropzone } from './useDropzone';

function dragEvent(files: File[] = []) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files },
  } as unknown as React.DragEvent<HTMLElement>;
}

describe('useDropzone', () => {
  it('dragOver で isOver が true、dragLeave で false に戻る', () => {
    const { result } = renderHook(() => useDropzone(vi.fn()));
    expect(result.current.isOver).toBe(false);

    act(() => result.current.dropzoneProps.onDragOver(dragEvent()));
    expect(result.current.isOver).toBe(true);

    act(() => result.current.dropzoneProps.onDragLeave(dragEvent()));
    expect(result.current.isOver).toBe(false);
  });

  it('drop でファイル配列をコールバックし、isOver を false に戻す', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useDropzone(onFiles));
    act(() => result.current.dropzoneProps.onDragOver(dragEvent()));

    const file = new File(['x'], 'a.png', { type: 'image/png' });
    act(() => result.current.dropzoneProps.onDrop(dragEvent([file])));

    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(result.current.isOver).toBe(false);
  });

  it('ファイルが無い drop ではコールバックしない', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useDropzone(onFiles));
    act(() => result.current.dropzoneProps.onDrop(dragEvent([])));
    expect(onFiles).not.toHaveBeenCalled();
  });
});
