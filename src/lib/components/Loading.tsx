export function Loading({ label = '処理中…' }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" aria-hidden />
      {label}
    </div>
  );
}
