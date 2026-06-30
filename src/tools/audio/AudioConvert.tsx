import { useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { withExtension } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import {
  type AudioFormat,
  type Mp3Bitrate,
  AUDIO_INPUT_EXTENSIONS,
  MP3_BITRATES,
  validateAudioFile,
} from './logic';
import { convertAudio } from './encode';

const FORMATS: { value: AudioFormat; label: string }[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
];

/** 音声ファイルを MP3 / WAV に変換する（Web Audio + lamejs）。 */
export function AudioConvert() {
  const [file, setFile] = useToolState<File | null>('audio.file', null);
  const [format, setFormat] = useToolState<AudioFormat>('audio.format', 'mp3');
  const [bitrate, setBitrate] = useToolState<Mp3Bitrate>('audio.bitrate', 192);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (files: File[]) => {
    const f = files[0];
    const err = validateAudioFile(f.name, f.size);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
    setError('');
  };

  const clearFile = () => {
    setFile(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { blob, ext } = await convertAudio(file, format, bitrate);
      downloadBlob(blob, withExtension(file.name, ext));
    } catch (e) {
      setError(e instanceof Error ? e.message : '変換に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  useToolHeader(
    {
      icon: <Icon name="audio" />,
      title: 'オーディオ変換',
      meta: file?.name,
      actions: (
        <button
          type="button"
          className="topbar-btn is-primary"
          onClick={handleConvert}
          disabled={!file || busy}
        >
          <Icon name="download" size={15} /> 変換してダウンロード
        </button>
      ),
    },
    [file, busy, format, bitrate],
  );

  return (
    <div className="tool-content">
      <Dropzone
        accept={AUDIO_INPUT_EXTENSIONS.join(',')}
        onFiles={handleFiles}
        icon="audio"
        label="音声ファイルをドラッグ&ドロップ、またはクリックして選択"
        hint="FLAC / WAV / MP3 / M4A / AAC / OGG など（最大100MB）"
      />

      {file && (
        <>
          <p className="hint" style={{ marginTop: 12 }}>
            選択中: {file.name} ・ {formatBytes(file.size)}
          </p>
          <div className="btn-row">
            <button type="button" className="btn-delete" onClick={clearFile}>
              <Icon name="trash" size={14} /> 選択した音声を削除
            </button>
          </div>
        </>
      )}

      <h3 className="section-label" style={{ marginTop: 22 }}>
        出力フォーマット
      </h3>
      <div className="segmented">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`seg${format === f.value ? ' is-active' : ''}`}
            onClick={() => setFormat(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {format === 'mp3' && (
        <div className="field" style={{ maxWidth: 280 }}>
          <label className="field-label" htmlFor="audio-bitrate">
            ビットレート
          </label>
          <select
            id="audio-bitrate"
            value={bitrate}
            onChange={(e) => setBitrate(Number(e.target.value) as Mp3Bitrate)}
          >
            {MP3_BITRATES.map((b) => (
              <option key={b} value={b}>
                {b} kbps{b === 320 ? '（高音質）' : b === 128 ? '（軽量）' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="field-note">
        ブラウザ内蔵デコーダで変換します。Safari は FLAC をデコードできないため、Chrome /
        Edge / Firefox を推奨します。
      </p>

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {busy && <Loading label="変換中…（長い音源は時間がかかります）" />}
    </div>
  );
}
