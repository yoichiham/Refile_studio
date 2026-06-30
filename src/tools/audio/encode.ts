import { bytesToBlob } from '../../lib/download';
import {
  type AudioFormat,
  type Mp3Bitrate,
  AUDIO_DECODE_ERROR,
  audioFormatInfo,
  encodeWav,
  floatTo16BitPCM,
} from './logic';

/** ブラウザ内蔵デコーダで音声を AudioBuffer に展開する（形式対応はブラウザ依存）。 */
export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const data = await file.arrayBuffer();
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    // decodeAudioData は一部ブラウザで callback 形式のため Promise でラップ
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(data.slice(0), resolve, reject);
    });
  } catch {
    throw new Error(AUDIO_DECODE_ERROR);
  } finally {
    void ctx.close();
  }
}

/** AudioBuffer の各チャンネルを Float32Array 配列として取り出す。 */
function getChannels(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }
  return channels;
}

/** AudioBuffer を lamejs で MP3 にエンコードする（動的 import）。 */
async function encodeMp3(buffer: AudioBuffer, kbps: Mp3Bitrate): Promise<Uint8Array> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const channels = getChannels(buffer);
  const numChannels = Math.min(2, channels.length);
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const left = floatTo16BitPCM(channels[0]);
  const right = numChannels > 1 ? floatTo16BitPCM(channels[1]) : undefined;

  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const r = right ? right.subarray(i, i + blockSize) : undefined;
    const buf = encoder.encodeBuffer(l, r);
    if (buf.length > 0) chunks.push(buf);
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);
  return concatBytes(chunks);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export interface AudioConvertResult {
  blob: Blob;
  ext: string;
}

/** 音声ファイルを指定形式に変換する。MP3 は lamejs、WAV は純粋関数。 */
export async function convertAudio(
  file: File,
  format: AudioFormat,
  kbps: Mp3Bitrate,
): Promise<AudioConvertResult> {
  const buffer = await decodeAudio(file);
  const info = audioFormatInfo(format);
  if (format === 'wav') {
    const bytes = encodeWav(getChannels(buffer), buffer.sampleRate);
    return { blob: bytesToBlob(bytes, info.mime), ext: info.ext };
  }
  const mp3 = await encodeMp3(buffer, kbps);
  return { blob: bytesToBlob(mp3, info.mime), ext: info.ext };
}
