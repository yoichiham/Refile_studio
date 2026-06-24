import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

export interface ToolHeader {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode; // ファイル名や状態
  actions?: ReactNode; // ヘッダー右側のアクション（ダウンロード等）
}

interface HeaderContextValue {
  header: ToolHeader | null;
  setHeader: (header: ToolHeader | null) => void;
}

const HeaderContext = createContext<HeaderContextValue>({
  header: null,
  setHeader: () => {},
});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ToolHeader | null>(null);
  return <HeaderContext.Provider value={{ header, setHeader }}>{children}</HeaderContext.Provider>;
}

export function useHeaderState(): HeaderContextValue {
  return useContext(HeaderContext);
}

/** ツール側からヘッダーバンドの内容を設定する。deps 変化で更新、アンマウントでクリア。 */
export function useToolHeader(header: ToolHeader, deps: DependencyList): void {
  const { setHeader } = useContext(HeaderContext);
  useEffect(() => {
    setHeader(header);
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
