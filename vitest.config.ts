import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@fluxdom/compiler': fileURLToPath(new URL('./packages/compiler/src/index.ts', import.meta.url)),
      '@fluxdom/runtime': fileURLToPath(new URL('./packages/runtime/src/index.ts', import.meta.url)),
      '@fluxdom/server': fileURLToPath(new URL('./packages/server/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
