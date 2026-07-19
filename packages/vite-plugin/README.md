# @fluxdom/vite-plugin

Vite transform support for experimental `.flow` components, including virtual
CSS modules and full-reload development updates.

```ts
import { defineConfig } from 'vite';
import { flowPlugin } from '@fluxdom/vite-plugin';

export default defineConfig({ plugins: [flowPlugin()] });
```

Safe static rendering helpers are available from `@fluxdom/vite-plugin/ssr`.
