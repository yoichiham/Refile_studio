import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { toolGroups, toolsByGroup } from '../tools/registry';
import { useHeaderState } from './header';
import { Icon } from './icons';

export function Layout() {
  const { header } = useHeaderState();
  const [collapsed, setCollapsed] = useState(false);

  // ファイルをウィンドウ外にドロップした際にブラウザがファイルを開いてしまうのを防ぐ
  // （ドラッグ&ドロップ追加を全ツールで安定させる）。
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div className={`app${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <button
            type="button"
            className="hamburger"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="メニューの開閉"
          >
            <Icon name="menu" size={20} />
          </button>
          <NavLink to="/" className="brand">
            Refile<span className="brand-accent">.studio</span>
          </NavLink>
        </div>

        <nav className="nav">
          {toolGroups.map((group) => (
            <div className="nav-group" key={group.id}>
              <div className="nav-group-head">
                <span className="nav-group-icon">
                  <Icon name={group.icon} size={15} />
                </span>
                <span className="nav-group-label">{group.label}</span>
              </div>
              <div className="nav-group-items">
                {toolsByGroup(group.id).map((tool) => (
                  <NavLink
                    key={tool.id}
                    to={`/${tool.id}`}
                    className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
                  >
                    <span className="nav-icon">
                      <Icon name={tool.icon} size={16} />
                    </span>
                    <span className="nav-label">{tool.title}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar-left">
            {header ? (
              <>
                {header.icon && <span className="topbar-icon">{header.icon}</span>}
                <span className="topbar-title">{header.title}</span>
                {header.meta && <span className="topbar-meta">{header.meta}</span>}
              </>
            ) : (
              <span className="topbar-title">Refile.studio</span>
            )}
          </div>
          <div className="topbar-actions">{header?.actions}</div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
