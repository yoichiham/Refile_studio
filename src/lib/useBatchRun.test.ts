import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBatchRun } from './useBatchRun';
import * as downloadModule from './download';

interface Named {
  name: string;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBatchRun', () => {
  it('進捗が進み、完了後に downloadResults が呼ばれる', async () => {
    const downloadSpy = vi.spyOn(downloadModule, 'downloadResults').mockResolvedValue();
    const { result } = renderHook(() => useBatchRun());
    const files: Named[] = [{ name: 'a' }, { name: 'b' }];
    const convert = async (f: Named) => ({ name: f.name, blob: new Blob([f.name]) });

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run(files, convert, { zipName: 'out.zip' });
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      await runPromise;
    });

    expect(result.current.busy).toBe(false);
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(downloadSpy.mock.calls[0][1]).toBe('out.zip');
  });

  it('cancel() を呼ぶと以降の処理が中断される', async () => {
    vi.spyOn(downloadModule, 'downloadResults').mockResolvedValue();
    const { result } = renderHook(() => useBatchRun());
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    let convertCount = 0;
    const convert = async (f: Named) => {
      convertCount++;
      if (f.name === 'a') {
        act(() => result.current.cancel());
      }
      return { name: f.name, blob: new Blob([f.name]) };
    };

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run(files, convert, { zipName: 'out.zip' });
    });
    await act(async () => {
      await runPromise;
    });

    expect(convertCount).toBe(1);
    expect(result.current.busy).toBe(false);
  });

  it('部分失敗時は failures に反映される', async () => {
    vi.spyOn(downloadModule, 'downloadResults').mockResolvedValue();
    const { result } = renderHook(() => useBatchRun());
    const files: Named[] = [{ name: 'a' }, { name: 'b' }];
    const convert = async (f: Named) => {
      if (f.name === 'b') throw new Error('失敗理由');
      return { name: f.name, blob: new Blob([f.name]) };
    };

    await act(async () => {
      await result.current.run(files, convert, { zipName: 'out.zip' });
    });

    await waitFor(() => {
      expect(result.current.failures).toEqual([{ fileName: 'b', message: '失敗理由' }]);
    });
  });
});
