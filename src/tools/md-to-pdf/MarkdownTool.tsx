import { useEffect, useMemo, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { ErrorMessage } from '../../lib/components/ErrorMessage';
import { Loading } from '../../lib/components/Loading';
import { downloadBlob } from '../../lib/download';
import { isBlank } from '../../lib/validation';
import { useToolHeader } from '../../app/header';
import { useToolState } from '../../app/session';
import { Icon } from '../../app/icons';
import { buildMarkdownFile } from './mdFile';
import { generateMarkdownPdf } from './generate';

type ViewMode = 'edit' | 'split' | 'preview';

/** ファイル名から使えない文字を除去。空なら untitled。 */
function safeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '').trim();
  return cleaned || 'untitled';
}

export function MarkdownTool() {
  const [text, setText] = useToolState('markdown.text', '');
  const [mode, setMode] = useToolState<ViewMode>('markdown.mode', 'split');
  const [fileName, setFileName] = useToolState('markdown.filename', 'untitled');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const md = useMemo(() => new MarkdownIt({ breaks: true }), []);
  const html = useMemo(() => md.render(text), [md, text]);

  const exportMd = () => {
    setMenuOpen(false);
    const out = buildMarkdownFile(text);
    if ('error' in out) {
      setError(out.error);
      return;
    }
    setError('');
    downloadBlob(out.result.blob, `${safeName(fileName)}.md`);
  };

  const exportPdf = async () => {
    setMenuOpen(false);
    if (isBlank(text)) {
      setError('テキストを入力してください');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await generateMarkdownPdf(text, `${safeName(fileName)}.pdf`);
    } catch {
      setError('PDF の生成に失敗しました。フォントの読み込みに失敗した可能性があります。');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!text || copied) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest('.export-menu')) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  useToolHeader(
    {
      icon: <Icon name="markdown" />,
      title: 'Markdown',
      meta: (
        <span className="filename-field">
          <input
            className="filename-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="untitled"
            aria-label="ファイル名"
            spellCheck={false}
          />
        </span>
      ),
      actions: (
        <>
          <button
            type="button"
            className={`topbar-btn${copied ? ' is-copied' : ''}`}
            onClick={handleCopy}
            disabled={!text}
          >
            {copied ? '☑️ COPIED' : <><Icon name="copy" size={15} /> COPY</>}
          </button>
          <div className="export-menu">
            <button
              type="button"
              className="topbar-btn is-primary"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy}
            >
              <Icon name="download" size={15} /> EXPORT
            </button>
            {menuOpen && (
              <div className="export-menu-list">
                <button type="button" onClick={exportMd}>
                  Markdown (.md)
                </button>
                <button type="button" onClick={exportPdf}>
                  PDF
                </button>
              </div>
            )}
          </div>
          <div className="view-toggle">
            {(['edit', 'split', 'preview'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'is-active' : ''}
                onClick={() => setMode(m)}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      ),
    },
    [text, busy, mode, menuOpen, fileName, copied],
  );

  return (
    <div className="tool-content is-wide">
      {busy && <Loading label="PDF を生成中…" />}
      <ErrorMessage>{error || undefined}</ErrorMessage>

      <div className={`md-split${mode !== 'split' ? ' is-single' : ''}`}>
        {mode !== 'preview' && (
          <div className="md-editor">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'# 見出し\n\n本文と **強調**、- リスト、表、```コード``` などに対応します。'}
            />
          </div>
        )}
        {mode !== 'edit' && <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </div>
  );
}
