import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HeaderProvider } from './header';
import { SessionProvider } from './session';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { tools } from '../tools/registry';

/**
 * GitHub Pages の静的配信でも直リンク・リロードが壊れないよう HashRouter を使う（SPEC §2）。
 * ルートはツールレジストリから自動生成し、未知のパスはトップへ戻す。
 */
export function App() {
  return (
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
  );
}
