import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@paint-studio/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
