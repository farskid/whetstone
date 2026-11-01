import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built site works from any static path (GitHub Pages, S3, a file share).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Tests assert on class and function names (error types, DI tokens), so keep them through minification.
  worker: { format: 'es', rolldownOptions: { output: { keepNames: true } } },
  build: { chunkSizeWarningLimit: 8000, rolldownOptions: { output: { keepNames: true } } },
});
