import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 配信向け。相対パス（'./'）にしておくと HashRouter と合わせて
// リポジトリ名に依存せずアセットが解決できる。固定パスにするなら '/<リポジトリ名>/'。
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Refile.studio',
        short_name: 'Refile',
        description: 'ブラウザだけで完結するファイル変換ユーティリティ集',
        theme_color: '#2f6df6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        // JS/CSS/HTML/SVG/MJS をプリキャッシュ（フォントは runtime で管理）
        globPatterns: ['**/*.{js,css,html,svg,mjs}'],
        runtimeCaching: [
          {
            // Noto Sans JP フォント（CacheFirst：一度キャッシュしたら1年間再利用）
            urlPattern: /\.ttf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/vitest.setup.ts',
  },
});
