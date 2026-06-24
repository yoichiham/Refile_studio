import { useToolState } from '../../app/session';
import { ImageConvert } from './ImageConvert';
import { ImageToPdfSection } from './ImageToPdfSection';

type Mode = 'convert' | 'topdf';

/** 画像ツール統合：リサイズ・フォーマット変換 と 画像→PDF をモードで切り替える。 */
export function ImageTool() {
  const [mode, setMode] = useToolState<Mode>('image.toolMode', 'convert');

  return (
    <div className="tool-content">
      <div className="segmented" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`seg${mode === 'convert' ? ' is-active' : ''}`}
          onClick={() => setMode('convert')}
        >
          リサイズ・変換
        </button>
        <button
          type="button"
          className={`seg${mode === 'topdf' ? ' is-active' : ''}`}
          onClick={() => setMode('topdf')}
        >
          画像 → PDF
        </button>
      </div>

      {mode === 'convert' ? <ImageConvert /> : <ImageToPdfSection />}
    </div>
  );
}
