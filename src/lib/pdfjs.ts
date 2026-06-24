import * as pdfjsLib from 'pdfjs-dist';
// Vite の ?url インポートでバンドル済みワーカーを指す。
// バージョン不一致を避けるため、pdfjs-dist 本体と同じパッケージから読み込む（CLAUDE.md 落とし穴）。
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
