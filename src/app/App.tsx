import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HeaderProvider } from './header';
import { SessionProvider } from './session';
import { ThemeProvider } from './theme';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { tools } from '../tools/registry';

/**
 * GitHub Pages の静的配信でも直リンク・リロードが壊れないよう HashRouter を使う（SPEC §2）。
 * ルートはツールレジストリから自動生成し、未知のパスはトップへ戻す。
 * ThemeProvider は SessionProvider の外側に置き、テーマ切替がツール状態の
 * 再レンダーを巻き込まないようにする。
 */
export function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <SessionProvider>
          <HeaderProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                {tools.map((tool) => {
                  const ToolComponent = tool.component;
                  return <Route key={tool.id} path={tool.id} element={<ToolComponent />} />;
                })}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HeaderProvider>
        </SessionProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
