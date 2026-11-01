import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Routing is hash-based (#/p/<id>), so a refresh always loads index.html. This 404.html copy is a fallback for a
// mistyped path under the Pages site: it boots the app instead of GitHub's 404 page.
const spaFallback = (): Plugin => {
  let dist = '';
  return {
    name: 'whetstone-404-fallback',
    apply: 'build',
    configResolved(c) { dist = resolve(c.root, c.build.outDir); },
    closeBundle() {
      if (existsSync(resolve(dist, 'index.html'))) copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
};

// Base path:
//  - dev server: '/' (http://localhost:5173/)
//  - build: BASE_PATH if set (the Pages workflow sets /whetstone/ for https://farskid.github.io/whetstone/),
//    otherwise './' so dist/ works from any static path.
// Monaco's workers (?worker imports), the test-runner worker (new URL(..., import.meta.url)) and assets all follow it.
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || (command === 'build' ? './' : '/'),
  plugins: [react(), spaFallback()],
  // Tests assert on class and function names (error types, DI tokens), so keep them through minification.
  worker: { format: 'es', rolldownOptions: { output: { keepNames: true } } },
  build: { chunkSizeWarningLimit: 8000, rolldownOptions: { output: { keepNames: true } } },
}));
