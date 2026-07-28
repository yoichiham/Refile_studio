import { describe, expect, it, vi } from 'vitest';
import { batchSummaryMessage, runBatch, uniqueName, validateBatchCount } from './batch';

interface Named {
  name: string;
}

function blob(text: string) {
  return new Blob([text]);
}

describe('runBatch', () => {
  it('全件成功なら results に順序どおり入り、failures は空', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const convert = vi.fn(async (f: Named) => ({ name: f.name, blob: blob(f.name) }));
    const result = await runBatch(files, convert);
    expect(result.results.map((r) => r.name)).toEqual(['a', 'b', 'c']);
    expect(result.failures).toEqual([]);
    expect(result.cancelled).toBe(false);
  });

  it('2件目が失敗しても3件目の処理を続行する', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const convert = vi.fn(async (f: Named) => {
      if (f.name === 'b') throw new Error('壊れています');
      return { name: f.name, blob: blob(f.name) };
    });
    const result = await runBatch(files, convert);
    expect(result.results.map((r) => r.name)).toEqual(['a', 'c']);
    expect(result.failures).toEqual([{ fileName: 'b', message: '壊れています' }]);
  });

  it('全件失敗なら results は空、failures に全件', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }];
    const convert = vi.fn(async () => {
      throw new Error('失敗');
    });
    const result = await runBatch(files, convert);
    expect(result.results).toEqual([]);
    expect(result.failures.map((f) => f.fileName)).toEqual(['a', 'b']);
  });

  it('onProgress が (done, total, current) の順で呼ばれる', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const convert = async (f: Named) => ({ name: f.name, blob: blob(f.name) });
    const calls: [number, number, string][] = [];
    await runBatch(files, convert, {
      onProgress: (done, total, current) => calls.push([done, total, current.name]),
    });
    expect(calls).toEqual([
      [1, 3, 'a'],
      [2, 3, 'b'],
      [3, 3, 'c'],
    ]);
  });

  it('onStatus が running→done / running→error の順で呼ばれる', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }];
    const convert = async (f: Named) => {
      if (f.name === 'b') throw new Error('x');
      return { name: f.name, blob: blob(f.name) };
    };
    const calls: [number, string][] = [];
    await runBatch(files, convert, {
      onStatus: (index, status) => calls.push([index, status]),
    });
    expect(calls).toEqual([
      [0, 'running'],
      [0, 'done'],
      [1, 'running'],
      [1, 'error'],
    ]);
  });

  it('中断すると以降の convert は呼ばれず cancelled が true になる', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const controller = new AbortController();
    const convert = vi.fn(async (f: Named) => {
      if (f.name === 'a') controller.abort();
      return { name: f.name, blob: blob(f.name) };
    });
    const result = await runBatch(files, convert, { signal: controller.signal });
    expect(convert).toHaveBeenCalledTimes(1);
    expect(result.cancelled).toBe(true);
  });

  it('逐次実行される（同時実行数が常に1）', async () => {
    const files: Named[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    let concurrent = 0;
    let maxConcurrent = 0;
    const convert = async (f: Named) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent--;
      return { name: f.name, blob: blob(f.name) };
    };
    await runBatch(files, convert);
    expect(maxConcurrent).toBe(1);
  });

  it('空配列なら convert を呼ばず results・failures とも空', async () => {
    const convert = vi.fn(async (f: Named) => ({ name: f.name, blob: blob(f.name) }));
    const result = await runBatch([], convert);
    expect(convert).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(result.cancelled).toBe(false);
  });
});

describe('uniqueName', () => {
  it('未使用の名前はそのまま返す', () => {
    const taken = new Set<string>();
    expect(uniqueName(taken, 'a.jpg')).toBe('a.jpg');
  });

  it('重複時は (2) を付与する', () => {
    const taken = new Set(['a.jpg']);
    expect(uniqueName(taken, 'a.jpg')).toBe('a (2).jpg');
  });

  it('さらに重複していれば (3) を付与する', () => {
    const taken = new Set(['a.jpg', 'a (2).jpg']);
    expect(uniqueName(taken, 'a.jpg')).toBe('a (3).jpg');
  });

  it('拡張子がなくても動作する', () => {
    const taken = new Set(['a']);
    expect(uniqueName(taken, 'a')).toBe('a (2)');
  });

  it('複数ドットを含む名前は最後の拡張子だけを扱う', () => {
    const taken = new Set(['a.b.jpg']);
    expect(uniqueName(taken, 'a.b.jpg')).toBe('a.b (2).jpg');
  });
});

describe('batchSummaryMessage', () => {
  it('全成功なら空文字', () => {
    expect(batchSummaryMessage(5, 0)).toBe('');
  });

  it('部分失敗の件数を明示する', () => {
    expect(batchSummaryMessage(3, 2)).toBe('5 件中 2 件が失敗しました（変換できた 3 件のみダウンロードしました）');
  });

  it('全失敗なら成功0件として明示する', () => {
    expect(batchSummaryMessage(0, 4)).toBe('4 件中 4 件が失敗しました');
  });
});

describe('validateBatchCount', () => {
  it('上限以下は許可', () => {
    expect(validateBatchCount(20, 20)).toBeNull();
  });

  it('上限超過はエラー文言を返す', () => {
    expect(validateBatchCount(21, 20)).toBe('一度に処理できるのは20件までです');
  });
});
