import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const tailwindEntry = () => ({
  name: 'tailwind-entry',
  resolveId(id) {
    if (id === 'virtual:tailwind.css') return '\0virtual:tailwind.css';
    return null;
  },
  load(id) {
    if (id === '\0virtual:tailwind.css') {
      return [
        '@tailwind base;',
        '@tailwind components;',
        '@tailwind utilities;',
        '@layer base {',
        '  svg:not([width]):not([height]) { width: 1em; height: 1em; flex-shrink: 0; }',
        '}',
        '',
      ].join('\n');
    }
    return null;
  },
});

export default defineConfig({
  plugins: [tailwindEntry(), react()],
  server: {
    host: true,
    port: 5173,
    open: false,
    // Dev-only: proxy API + chat WebSocket to the backend so the app talks to a
    // single origin (the Vite dev server). This makes it work unchanged from a
    // phone over LAN — the device hits http://<lan-ip>:5173/api/... and Vite
    // forwards to the backend on the dev machine — with no CORS and no
    // "localhost = the phone" problem. Requires the frontend to use a relative
    // API base (VITE_API_BASE_URL empty; see .env.local). No effect on builds.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-three': ['three'],
          'vendor-hls': ['hls.js'],
          'vendor-tinymce': ['@tinymce/tinymce-react', 'tinymce'],
        },
      },
    },
  },
});
