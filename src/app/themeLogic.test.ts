import { describe, expect, it } from 'vitest';
import { nextThemeMode, parseThemeMode, resolveTheme, themeLabel } from './themeLogic';

describe('parseThemeMode', () => {
  it('null は system 扱い', () => {
    expect(parseThemeMode(null)).toBe('system');
  });
  it('空文字は system 扱い', () => {
    expect(parseThemeMode('')).toBe('system');
  });
  it('不正な値は system 扱い', () => {
    expect(parseThemeMode('sepia')).toBe('system');
  });
  it('light はそのまま', () => {
    expect(parseThemeMode('light')).toBe('light');
  });
  it('dark はそのまま', () => {
    expect(parseThemeMode('dark')).toBe('dark');
  });
  it('system はそのまま', () => {
    expect(parseThemeMode('system')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('light 固定なら OS 設定に関わらず light', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
  });
  it('dark 固定なら OS 設定に関わらず dark', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('system は OS の prefers-color-scheme に従う', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('nextThemeMode', () => {
  it('system → light → dark → system の順で循環する', () => {
    expect(nextThemeMode('system')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('system');
  });
});

describe('themeLabel', () => {
  it('各モードの日本語ラベルを返す', () => {
    expect(themeLabel('system')).toBe('システム');
    expect(themeLabel('light')).toBe('ライト');
    expect(themeLabel('dark')).toBe('ダーク');
  });
});
