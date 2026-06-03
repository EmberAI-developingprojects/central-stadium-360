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
          'vendor-tinymce': ['@tinymce/tinymce-react'],
        },
      },
    },
  },
});
