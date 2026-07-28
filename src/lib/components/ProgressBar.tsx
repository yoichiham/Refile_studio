interface ProgressBarProps {
  done: number;
  total: number;
  label?: string;
}

/** バッチ処理の進捗バー（N/M 件完了）。 */
export function ProgressBar({ done, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" role="status" aria-live="polite">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-label">{label ?? `${done} / ${total} 件`}</div>
    </div>
  );
}
