export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** localStorage から読んだ生値をテーマモードに変換する。不正値は system 扱い。 */
export function parseThemeMode(raw: string | null): ThemeMode {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/** モードと OS の prefers-color-scheme から実際に適用するテーマを決める。 */
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

/** サイドバーのトグルボタン用：system → light → dark → system と循環する。 */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  const i = MODES.indexOf(mode);
  return MODES[(i + 1) % MODES.length];
}

export function themeLabel(mode: ThemeMode): string {
  switch (mode) {
    case 'system':
      return 'システム';
    case 'light':
      return 'ライト';
    case 'dark':
      return 'ダーク';
    default: {
      const exhaustiveCheck: never = mode;
      return exhaustiveCheck;
    }
  }
}
