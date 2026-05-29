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
      return '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
    }
    return null;
  },
});

export default defineConfig({
  plugins: [tailwindEntry(), react()],
  server: {
    port: 5173,
    open: false,
  },
});
