import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Store = Record<string, unknown>;

interface SessionContextValue {
  store: Store;
  update: (key: string, updater: (prev: unknown) => unknown) => void;
}

const SessionContext = createContext<SessionContextValue>({
  store: {},
  update: () => {},
});

/**
 * ツール横断のメモリ内ステート保持。
 * ルーター配下で常時マウントされるため、ツールを切り替えても内容が残る。
 * localStorage 等には保存しないので、リロードすると初期化される（SPEC §2.1-2）。
 *
 * 既知の制約：store はキー単位で購読を分けていないため、いずれかの
 * useToolState を更新すると全コンシューマが再レンダーされる。進捗表示など
 * 高頻度に更新する値はここに置かず、ツール側のローカル state に持つこと。
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({});
  const update = useCallback((key: string, updater: (prev: unknown) => unknown) => {
    setStore((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  }, []);
  const value = useMemo(() => ({ store, update }), [store, update]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** useState と同じ使い心地で、値をセッションストアに保持する。 */
export function useToolState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const { store, update } = useContext(SessionContext);
  const value = (key in store ? store[key] : initial) as T;
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      update(key, (prev) => {
        const base = (prev === undefined ? initial : prev) as T;
        return typeof next === 'function' ? (next as (p: T) => T)(base) : next;
      });
    },
    // initial を deps に含めるとオブジェクト初期値で無限ループしうるため key のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set];
}
