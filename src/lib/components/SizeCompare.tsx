import { formatBytes, reductionPercent } from '../format';

interface SizeCompareProps {
  beforeBytes: number;
  afterBytes: number;
  beforeDim?: string;
  afterDim?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

/** スクショ風の「サイズ比較」カード（変換前/変換後＋削減率）。 */
export function SizeCompare({
  beforeBytes,
  afterBytes,
  beforeDim,
  afterDim,
  beforeLabel = '変換前',
  afterLabel = '変換後',
}: SizeCompareProps) {
  const r = reductionPercent(beforeBytes, afterBytes);
  return (
    <div className="compare">
      <div className="compare-title">サイズ比較</div>
      <div className="compare-cols">
        <div className="compare-col">
          <div className="compare-head">{beforeLabel}</div>
          <div className="compare-size">{formatBytes(beforeBytes)}</div>
          {beforeDim && <div className="compare-dim">{beforeDim}</div>}
        </div>
        <div className="compare-col is-after">
          <div className="compare-head">{afterLabel}</div>
          <div className="compare-size">{formatBytes(afterBytes)}</div>
          {afterDim && <div className="compare-dim">{afterDim}</div>}
        </div>
      </div>
      <div className={`compare-foot${r < 0 ? ' is-up' : ''}`}>
        {r >= 0 ? `${r}% サイズ削減` : `${Math.abs(r)}% サイズ増加`}
      </div>
    </div>
  );
}
