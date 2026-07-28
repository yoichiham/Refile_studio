import { useState } from 'react';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { ProgressBar } from '../../lib/components/ProgressBar';
import { Dropzone } from '../../lib/components/Dropzone';
import { Loading } from '../../lib/components/Loading';
import { type BatchItemStatus, batchSummaryMessage, uniqueName } from '../../lib/batch';
import { downloadBlob } from '../../lib/download';
import { rejectionMessage, partitionFiles } from '../../lib/fileIntake';
import { timestampFileName, withExtension } from '../../lib/filename';
import { formatBytes } from '../../lib/format';
import { useObjectUrl } from '../../lib/useObjectUrl';
import { useBatchRun } from '../../lib/useBatchRun';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { MAX_HEIC_BATCH, type HeicOutputFormat, validateHeicFile } from './logic';
import { convertHeic } from './convert';

const FORMATS: { value: HeicOutputFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

const STATUS_LABELS: Record<BatchItemStatus, string> = {
  pending: '待機中',
  running: '変換中…',
  done: '完了',
  error: '失敗',
};

/** iPhone の HEIC/HEIF 写真を JPEG/PNG に変換する（heic2any）。1枚/複数枚どちらも扱える。 */
export function HeicConvert() {
  const [files, setFiles] = useToolState<File[]>('heic.files', []);
  const [format, setFormat] = useToolState<HeicOutputFormat>('heic.format', 'jpeg');
  const [quality, setQuality] = useToolState('heic.quality', 92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [outBytes, setOutBytes] = useState(0);
  const [outUrl, setOutUrl] = useObjectUrl();
  const batch = useBatchRun();

  // 1枚のときだけ従来の単一ファイルUI（プレビュー付き）を使う
  const file = files.length === 1 ? files[0] : null;

  // 単一ファイルの変換結果を破棄する。フォーマット/品質を変えたら再変換が必要なため、
  // 古いプレビューや拡張子と中身が食い違うダウンロード対象を残さない。
  const resetOutput = () => {
    setOutBlob(null);
    setOutBytes(0);
    setOutUrl(null);
  };

  const handleFiles = (incoming: File[]) => {
    const { valid, rejected } = partitionFiles(incoming, (f) => validateHeicFile(f.name, f.size));
    if (valid.length > MAX_HEIC_BATCH) {
      setError(`一度に処理できるのは${MAX_HEIC_BATCH}件までです`);
      return;
    }
    setError(rejected.length > 0 ? rejectionMessage(rejected) : '');
    if (valid.length > 0) {
      // D&D は既存の選択への追加ではなく置換（同じ設定を選び直したファイル群に適用するため）
      setFiles(valid);
      resetOutput();
      batch.reset();
    }
  };

  const clearFiles = () => {
    setFiles([]);
    resetOutput();
    batch.reset();
    setError('');
  };

  const changeFormat = (value: HeicOutputFormat) => {
    setFormat(value);
    resetOutput();
  };

  const changeQuality = (value: number) => {
    setQuality(value);
    resetOutput();
  };

  const handleConvertSingle = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { blob } = await convertHeic(file, format, quality / 100);
      setOutBlob(blob);
      setOutBytes(blob.size);
      setOutUrl(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : '変換に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const handleConvertBatch = async () => {
    setError('');
    const taken = new Set<string>();
    await batch.run(
      files,
      async (f) => {
        const { blob, ext } = await convertHeic(f, format, quality / 100);
        return { name: uniqueName(taken, withExtension(f.name, ext)), blob };
      },
      { zipName: timestampFileName('zip') },
    );
  };

  const download = () => {
    if (file && outBlob) downloadBlob(outBlob, withExtension(file.name, format === 'jpeg' ? 'jpg' : 'png'));
  };

  useToolHeader(
    {
      icon: <Icon name="heic" />,
      title: 'HEIC 変換',
      meta: files.length === 1 ? files[0].name : files.length > 1 ? `${files.length} 枚` : undefined,
      actions:
        files.length <= 1 ? (
          <button type="button" className="topbar-btn is-primary" onClick={download} disabled={!outBlob}>
            <Icon name="download" size={15} /> ダウンロード
          </button>
        ) : undefined,
    },
    [files, outBlob, outBytes],
  );

  return (
    <div className="tool-content">
      <Dropzone
        accept=".heic,.heif"
        multiple
        onFiles={handleFiles}
        icon="image"
        label="HEIC / HEIF ファイルをドラッグ&ドロップ、またはクリックして選択（複数可）"
        hint="iPhone の写真（.heic / .heif）・1ファイル最大50MB・一度に最大20ファイル"
        selectedLabel={
          files.length === 1
            ? `${files[0].name} ・ ${formatBytes(files[0].size)}`
            : files.length > 1
              ? `${files.length} ファイル選択中`
              : undefined
        }
      />

      {files.length > 0 && (
        <div className="btn-row">
          <button type="button" className="btn-delete" onClick={clearFiles}>
            <Icon name="trash" size={14} /> 選択したファイルを削除
          </button>
        </div>
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
            onClick={() => changeFormat(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {format === 'jpeg' ? (
        <div className="field" style={{ maxWidth: 360 }}>
          <div className="slider-row">
            <label className="field-label" style={{ margin: 0 }} htmlFor="heic-q">
              品質
            </label>
            <span className="slider-value">{quality}%</span>
          </div>
          <input
            id="heic-q"
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => changeQuality(Number(e.target.value))}
          />
        </div>
      ) : (
        <p className="field-note">PNG は可逆（ロスレス）形式のため、品質の指定はありません。</p>
      )}

      <ErrorMessage>{error || undefined}</ErrorMessage>

      {file && (
        <>
          <div className="btn-row">
            <button type="button" className="btn" onClick={handleConvertSingle} disabled={busy}>
              変換する
            </button>
          </div>

          {busy && <Loading label="変換中…（初回はライブラリの読み込みに時間がかかります）" />}

          {outUrl && !busy && (
            <>
              <h3 className="section-label" style={{ marginTop: 22 }}>
                変換後プレビュー（{formatBytes(outBytes)}）
              </h3>
              <div className="pdf-preview">
                <img src={outUrl} alt="変換後プレビュー" />
              </div>
            </>
          )}
        </>
      )}

      {files.length > 1 && (
        <>
          <ul className="file-list">
            {files.map((f, index) => (
              <li key={`${f.name}-${index}`}>
                <span className="file-order">{index + 1}.</span>
                <span className="file-name">{f.name}</span>
                <span className={`batch-status is-${batch.statuses[index] ?? 'pending'}`}>
                  {STATUS_LABELS[batch.statuses[index] ?? 'pending']}
                </span>
              </li>
            ))}
          </ul>

          {batch.failures.length > 0 && !batch.busy && (
            <ErrorMessage tone="warn">
              {batchSummaryMessage(files.length - batch.failures.length, batch.failures.length)}
            </ErrorMessage>
          )}

          <div className="btn-row">
            <button type="button" className="btn" onClick={handleConvertBatch} disabled={batch.busy}>
              変換してダウンロード
            </button>
            {batch.busy && (
              <button type="button" className="btn btn-secondary" onClick={batch.cancel}>
                中止
              </button>
            )}
          </div>

          {batch.progress && (
            <ProgressBar
              done={batch.progress.done}
              total={batch.progress.total}
              label={`変換中… ${batch.progress.done} / ${batch.progress.total} 件（${batch.progress.currentName}）`}
            />
          )}
        </>
      )}
    </div>
  );
}
