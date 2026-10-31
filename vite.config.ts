import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built site works from any static path (GitHub Pages, S3, a file share).
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 8000 },
});
