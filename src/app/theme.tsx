import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type ThemeMode, nextThemeMode, parseThemeMode, resolveTheme } from './themeLogic';

const STORAGE_KEY = 'refile.theme';
const THEME_COLOR_LIGHT = '#2f6df6';
const THEME_COLOR_DARK = '#14161c';

function readStoredMode(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Safari プライベートモード等で localStorage が例外を投げても system にフォールバック
    return 'system';
  }
}

function writeStoredMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // 保存できなくても致命的ではないため無視（次回起動時は system 扱いに戻るだけ）
  }
}

interface ThemeContextValue {
  mode: ThemeMode;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'system', cycle: () => {} });

/**
 * data-theme 属性の解決・適用を担う。ツール状態を持つ SessionProvider の外側に置き、
 * テーマ変更でツール入力が巻き込まれないようにする（App.tsx 参照）。
 * 保存するのは 'system'|'light'|'dark' の3値のみ（SPEC §2.1-2 の「入力データ」には該当しない）。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = resolveTheme(mode, mq.matches);
      document.documentElement.setAttribute('data-theme', resolved);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
    };
    apply();
    if (mode !== 'system') return undefined;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      cycle: () =>
        setMode((prev) => {
          const next = nextThemeMode(prev);
          writeStoredMode(next);
          return next;
        }),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
