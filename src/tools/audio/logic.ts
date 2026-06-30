export type AudioFormat = 'mp3' | 'wav';

export const AUDIO_TYPE_ERROR = '対応していない音声ファイル形式です';
export const AUDIO_SIZE_ERROR = 'ファイルサイズは100MB以下にしてください';
export const AUDIO_DECODE_ERROR =
  'このファイル形式はお使いのブラウザでデコードできませんでした（Safari は FLAC 非対応）';

/** 音声の最大サイズ = 100MB（ちょうどは許可、超過はエラー）。 */
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

/** 受付対象の拡張子（実際にデコードできるかはブラウザ依存）。 */
export const AUDIO_INPUT_EXTENSIONS = [
  '.flac',
  '.wav',
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.oga',
  '.opus',
  '.weba',
] as const;

/** MP3 出力のビットレート選択肢（kbps）。 */
export const MP3_BITRATES = [128, 192, 320] as const;
export type Mp3Bitrate = (typeof MP3_BITRATES)[number];

export interface AudioFormatInfo {
  mime: string;
  ext: string;
}

export function audioFormatInfo(format: AudioFormat): AudioFormatInfo {
  return format === 'mp3'
    ? { mime: 'audio/mpeg', ext: 'mp3' }
    : { mime: 'audio/wav', ext: 'wav' };
}

/** 音声ファイルを拡張子・サイズで検証。エラーは日本語、正常は null。 */
export function validateAudioFile(name: string, size: number): string | null {
  const lower = name.toLowerCase();
  if (!AUDIO_INPUT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return AUDIO_TYPE_ERROR;
  }
  if (size > MAX_AUDIO_BYTES) {
    return AUDIO_SIZE_ERROR;
  }
  return null;
}

/**
 * Float32（-1..1）の PCM を 16bit 符号付き PCM に変換する。
 * 範囲外は ±1.0 にクランプ。負値は 0x8000、正値は 0x7FFF でスケール。
 */
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/**
 * チャンネル別 Float32 PCM を 16bit PCM の WAV（RIFF/WAVE）バイト列に変換する。
 * チャンネルはフレーム単位でインターリーブする。
 */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length;
  const numFrames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][frame]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}
