import { describe, expect, it } from 'vitest';
import {
  AUDIO_SIZE_ERROR,
  AUDIO_TYPE_ERROR,
  audioFormatInfo,
  encodeWav,
  floatTo16BitPCM,
  validateAudioFile,
} from './logic';

/** ヘルパ：Uint8Array の指定オフセットから ASCII 文字列を読む。 */
function ascii(bytes: Uint8Array, offset: number, len: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + len));
}
/** ヘルパ：32bit リトルエンディアン整数を読む。 */
function readU32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint32(offset, true);
}
/** ヘルパ：16bit リトルエンディアン整数を読む。 */
function readU16LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint16(offset, true);
}

describe('floatTo16BitPCM', () => {
  it('0 / +1 / -1 を 16bit PCM に変換', () => {
    const out = floatTo16BitPCM(new Float32Array([0, 1, -1]));
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(32767);
    expect(out[2]).toBe(-32768);
  });
  it('範囲外は ±1.0 にクランプ', () => {
    const out = floatTo16BitPCM(new Float32Array([2, -2]));
    expect(out[0]).toBe(32767);
    expect(out[1]).toBe(-32768);
  });
});

describe('encodeWav', () => {
  it('モノラルの RIFF/WAVE ヘッダとサンプルを正しく書き込む', () => {
    const wav = encodeWav([new Float32Array([0, 1])], 8000);
    expect(ascii(wav, 0, 4)).toBe('RIFF');
    expect(ascii(wav, 8, 4)).toBe('WAVE');
    expect(ascii(wav, 12, 4)).toBe('fmt ');
    expect(readU16LE(wav, 20)).toBe(1); // PCM
    expect(readU16LE(wav, 22)).toBe(1); // channels
    expect(readU32LE(wav, 24)).toBe(8000); // sampleRate
    expect(readU16LE(wav, 34)).toBe(16); // bitsPerSample
    expect(ascii(wav, 36, 4)).toBe('data');
    expect(readU32LE(wav, 40)).toBe(4); // dataSize = 2 samples * 1ch * 2byte
    expect(wav.length).toBe(44 + 4);
    // サンプル: 0 -> 0, 1.0 -> 32767(0x7FFF, LE = 0xFF,0x7F)
    expect(wav[44]).toBe(0);
    expect(wav[45]).toBe(0);
    expect(wav[46]).toBe(0xff);
    expect(wav[47]).toBe(0x7f);
  });

  it('ステレオはチャンネルをインターリーブし byteRate/blockAlign を計算', () => {
    const wav = encodeWav([new Float32Array([0]), new Float32Array([0])], 44100);
    expect(readU16LE(wav, 22)).toBe(2); // channels
    expect(readU32LE(wav, 24)).toBe(44100); // sampleRate
    expect(readU32LE(wav, 28)).toBe(44100 * 2 * 2); // byteRate = rate*ch*bytesPerSample
    expect(readU16LE(wav, 32)).toBe(2 * 2); // blockAlign = ch*bytesPerSample
    expect(readU32LE(wav, 40)).toBe(4); // dataSize = 1frame * 2ch * 2byte
  });
});

describe('audioFormatInfo', () => {
  it('mp3 / wav の mime と拡張子', () => {
    expect(audioFormatInfo('mp3')).toEqual({ mime: 'audio/mpeg', ext: 'mp3' });
    expect(audioFormatInfo('wav')).toEqual({ mime: 'audio/wav', ext: 'wav' });
  });
});

describe('validateAudioFile', () => {
  it('対応拡張子は許可（大文字小文字問わず）', () => {
    expect(validateAudioFile('song.flac', 1000)).toBeNull();
    expect(validateAudioFile('SONG.MP3', 1000)).toBeNull();
    expect(validateAudioFile('a.wav', 1000)).toBeNull();
  });
  it('非対応拡張子はエラー', () => {
    expect(validateAudioFile('doc.pdf', 1000)).toBe(AUDIO_TYPE_ERROR);
    expect(validateAudioFile('noext', 1000)).toBe(AUDIO_TYPE_ERROR);
  });
  it('100MB 超はエラー（ちょうどは許可）', () => {
    const max = 100 * 1024 * 1024;
    expect(validateAudioFile('a.flac', max)).toBeNull();
    expect(validateAudioFile('a.flac', max + 1)).toBe(AUDIO_SIZE_ERROR);
  });
});
