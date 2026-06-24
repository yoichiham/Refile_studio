import { Link } from 'react-router-dom';
import { toolGroups, toolsByGroup } from '../tools/registry';
import { Icon } from './icons';

export function HomePage() {
  return (
    <div className="home">
      <h1 className="home-title">Refile.studio</h1>
      <p className="home-lead">
        ブラウザだけで完結するファイル変換ユーティリティ集です。
        アップロードしたファイルや入力テキストはサーバーに送信されず、すべて端末内で処理されます。
      </p>

      {toolGroups.map((group) => (
        <section className="home-section" key={group.id}>
          <h2 className="home-section-title">
            <Icon name={group.icon} size={15} /> {group.label}
          </h2>
          <div className="tool-grid">
            {toolsByGroup(group.id).map((tool) => (
              <Link key={tool.id} to={`/${tool.id}`} className="tool-card">
                <div className="tool-card-icon">
                  <Icon name={tool.icon} size={22} />
                </div>
                <div className="tool-card-body">
                  <div className="tool-card-title">{tool.title}</div>
                  <div className="tool-card-desc">{tool.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
