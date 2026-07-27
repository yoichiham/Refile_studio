import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bytesToBlob, downloadBlob, downloadText } from './download';

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom は createObjectURL/revokeObjectURL を実装していないため直接定義する
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    // jsdom は <a> の実クリックでナビゲーションを試みて警告を出すため無効化する
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('click 直後は revokeObjectURL を呼ばない', () => {
    downloadBlob(new Blob(['x']), 'a.txt');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('60秒後に revokeObjectURL が呼ばれる', () => {
    downloadBlob(new Blob(['x']), 'a.txt');
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('a.download に指定したファイル名が設定される', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    downloadBlob(new Blob(['x']), 'report.pdf');
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('report.pdf');
  });
});

describe('downloadText', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('指定 MIME の Blob として downloadBlob に渡す', () => {
    URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
      expect(blob.type).toBe('text/markdown');
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();
    downloadText('# hi', 'a.md', 'text/markdown');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('bytesToBlob', () => {
  it('元の Uint8Array を破壊しない', () => {
    const original = new Uint8Array([1, 2, 3]);
    const copy = original.slice();
    bytesToBlob(original, 'application/octet-stream');
    expect(original).toEqual(copy);
  });

  it('指定 MIME の Blob を返す', () => {
    const blob = bytesToBlob(new Uint8Array([1, 2, 3]), 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(3);
  });
});
