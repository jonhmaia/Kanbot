import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { kanbotAskPlugin } from './vite-plugin-ask.js';

const apiPort = Number(process.env.PORT) || 4000;
const webPort = Number(process.env.VITE_PORT) || 5173;

export default defineConfig({
  plugins: [react(), kanbotAskPlugin()],
  clearScreen: false,
  server: {
    port: webPort,
    strictPort: false,
    watch: {
      ignored: ['**/src-tauri/**', '**/.tmp-edge-profile/**'],
    },
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        bypass(req) {
          if (req.url?.startsWith('/api/ask') || req.url?.startsWith('/api/download-windows')) return req.url;
        },
      },
    },
  },
});
