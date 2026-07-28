import { describe, expect, it } from 'vitest';
import { fontUrls, shouldAutoPrefetch } from './fontCache';

describe('fontUrls', () => {
  it('相対 base（./）でのフォントURL', () => {
    expect(fontUrls('./')).toEqual([
      './fonts/NotoSansJP-Regular.ttf',
      './fonts/NotoSansJP-Bold.ttf',
    ]);
  });

  it('リポジトリ名を含む固定 base でのフォントURL', () => {
    expect(fontUrls('/Refile_studio/')).toEqual([
      '/Refile_studio/fonts/NotoSansJP-Regular.ttf',
      '/Refile_studio/fonts/NotoSansJP-Bold.ttf',
    ]);
  });
});

describe('shouldAutoPrefetch', () => {
  it('Save-Data 有効なら取得しない', () => {
    expect(shouldAutoPrefetch({ saveData: true, effectiveType: '4g' })).toBe(false);
  });

  it('回線種別が 2g なら取得しない', () => {
    expect(shouldAutoPrefetch({ saveData: false, effectiveType: '2g' })).toBe(false);
  });

  it('回線種別が slow-2g なら取得しない', () => {
    expect(shouldAutoPrefetch({ saveData: false, effectiveType: 'slow-2g' })).toBe(false);
  });

  it('回線種別が 4g なら取得する', () => {
    expect(shouldAutoPrefetch({ saveData: false, effectiveType: '4g' })).toBe(true);
  });

  it('Network Information API 非対応（undefined）なら取得する', () => {
    expect(shouldAutoPrefetch(undefined)).toBe(true);
  });
});
