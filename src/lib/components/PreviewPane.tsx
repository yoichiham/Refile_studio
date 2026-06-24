export function PreviewPane({ url }: { url?: string }) {
  return (
    <div className="preview-pane">
      {url ? (
        <img src={url} alt="プレビュー" />
      ) : (
        <div className="preview-empty">プレビューはここに表示されます</div>
      )}
    </div>
  );
}
