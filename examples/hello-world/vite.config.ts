import { defineConfig } from 'vite';
import { flowPlugin } from '@fluxdom/vite-plugin';

export default defineConfig({
  plugins: [flowPlugin()],
  server: { port: 5180 }
});
