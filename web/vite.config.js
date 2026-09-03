import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { kanbotAskPlugin } from './vite-plugin-ask.js';

export default defineConfig({
  plugins: [react(), kanbotAskPlugin()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass(req) {
          if (req.url?.startsWith('/api/ask')) return req.url;
        },
      },
    },
  },
});
