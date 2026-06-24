/** pdfmake インスタンス（UMD のため型は緩く扱う）。 */
export interface PdfMakeLike {
  vfs?: Record<string, string>;
  fonts?: Record<string, unknown>;
  createPdf: (
    doc: unknown,
    tableLayouts?: unknown,
  ) => { download: (fileName: string) => void };
}

let fontReady: Promise<void> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('フォントの読み込みに失敗しました');
  return arrayBufferToBase64(await res.arrayBuffer());
}

/**
 * Noto Sans JP を vfs に動的登録する（SPEC §6.4 / §9-1）。
 * フォントはバンドルせず public/fonts から fetch し、一度だけ登録する。
 */
export function ensureJapaneseFont(pdfMake: PdfMakeLike): Promise<void> {
  if (!fontReady) {
    fontReady = (async () => {
      const base = import.meta.env.BASE_URL;
      const [regular, bold] = await Promise.all([
        fetchAsBase64(`${base}fonts/NotoSansJP-Regular.ttf`),
        fetchAsBase64(`${base}fonts/NotoSansJP-Bold.ttf`),
      ]);
      pdfMake.vfs = {
        ...(pdfMake.vfs ?? {}),
        'NotoSansJP-Regular.ttf': regular,
        'NotoSansJP-Bold.ttf': bold,
      };
      pdfMake.fonts = {
        NotoSansJP: {
          normal: 'NotoSansJP-Regular.ttf',
          bold: 'NotoSansJP-Bold.ttf',
          italics: 'NotoSansJP-Regular.ttf',
          bolditalics: 'NotoSansJP-Bold.ttf',
        },
      };
    })().catch((e) => {
      fontReady = null; // 失敗したら次回再試行できるようにする
      throw e;
    });
  }
  return fontReady;
}
