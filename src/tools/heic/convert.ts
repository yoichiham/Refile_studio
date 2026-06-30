import { type HeicOutputFormat, HEIC_CONVERT_ERROR, heicOutputInfo } from './logic';

export interface HeicConvertResult {
  blob: Blob;
  ext: string;
}

/** HEIC/HEIF を JPEG/PNG に変換する（heic2any 動的 import）。 */
export async function convertHeic(
  file: File,
  format: HeicOutputFormat,
  quality: number,
): Promise<HeicConvertResult> {
  const info = heicOutputInfo(format);
  try {
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({
      blob: file,
      toType: info.mime,
      quality: format === 'jpeg' ? quality : undefined,
    });
    // ライブフォト等で配列が返る場合は先頭を採用
    const blob = Array.isArray(out) ? out[0] : out;
    return { blob, ext: info.ext };
  } catch {
    throw new Error(HEIC_CONVERT_ERROR);
  }
}
