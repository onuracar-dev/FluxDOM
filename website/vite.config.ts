import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@fluxdom/runtime': resolve(__dirname, '../packages/runtime/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: { rollupOptions: { maxParallelFileOps: 128 } },
});
