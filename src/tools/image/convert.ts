import { canvasToBlob, drawToCanvas, loadImageElement } from '../../lib/image';
import { type CropRect, type OutputFormat, formatInfo } from './logic';

export interface ImageConvertSpec {
  width: number;
  height: number;
  format: OutputFormat;
  /** 1-100（PNG では無視される）。 */
  quality: number;
  cropRect?: CropRect;
}

export interface ImageConvertResult {
  blob: Blob;
  ext: string;
  mime: string;
  width: number;
  height: number;
}

/** 読み込み済み画像を指定仕様でエンコードする。呼び出し元は blob と ext が必ず対応する保証を得る。 */
export async function convertLoadedImage(
  img: HTMLImageElement,
  spec: ImageConvertSpec,
): Promise<ImageConvertResult> {
  const info = formatInfo(spec.format);
  const canvas = drawToCanvas(
    img,
    spec.width,
    spec.height,
    spec.format === 'jpeg' ? '#ffffff' : undefined,
    spec.cropRect,
  );
  const blob = await canvasToBlob(canvas, info.mime, spec.format === 'png' ? undefined : spec.quality / 100);
  return { blob, ext: info.ext, mime: info.mime, width: spec.width, height: spec.height };
}

/** File を読み込んでから指定仕様でエンコードする（一括変換で1ファイルずつ呼ぶ用途）。 */
export async function convertImageFile(file: File, spec: ImageConvertSpec): Promise<ImageConvertResult> {
  const img = await loadImageElement(file);
  return convertLoadedImage(img, spec);
}
