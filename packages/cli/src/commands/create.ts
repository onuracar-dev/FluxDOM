import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export interface CreateOptions {
  cwd?: string;
  log?: (message: string) => void;
}

export function create(args: string[], options: CreateOptions = {}): string {
  const requestedPath = args[0] || 'my-flow-app';
  const root = resolve(options.cwd ?? process.cwd(), requestedPath);
  const projectName = toPackageName(basename(root));
  const log = options.log ?? console.log;

  if (existsSync(root) && readdirSync(root).length > 0) {
    throw new Error(`Refusing to overwrite non-empty directory: ${root}`);
  }

  mkdirSync(resolve(root, 'src'), { recursive: true });
  write(root, 'package.json', `${JSON.stringify({
    name: projectName,
    version: '0.0.0',
    private: true,
    type: 'module',
    engines: { node: '>=20.19.0' },
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@fluxdom/runtime': '^0.1.0',
    },
    devDependencies: {
      '@fluxdom/vite-plugin': '^0.1.0',
      typescript: '^5.4.0',
      vite: '^8.1.5',
    },
  }, null, 2)}\n`);
  write(root, 'index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FluxDOM App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`);
  write(root, 'vite.config.ts', `import { defineConfig } from 'vite';
import { flowPlugin } from '@fluxdom/vite-plugin';

export default defineConfig({ plugins: [flowPlugin()] });
`);
  write(root, 'tsconfig.json', `${JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      noEmit: true,
    },
    include: ['src', 'vite.config.ts'],
  }, null, 2)}\n`);
  write(root, '.gitignore', 'node_modules/\ndist/\n.env\n');
  write(root, 'src/env.d.ts', `/// <reference types="vite/client" />

declare module '*.flow' {
  export function render(): HTMLElement | Text | Array<HTMLElement | Text> | null;
}
`);
  write(root, 'src/main.ts', `import { insert } from '@fluxdom/runtime';
import { render } from './App.flow';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app mount point');

const output = render();
if (output) insert(root, output);
`);
  write(root, 'src/App.flow', `<script lang="ts">
  let count = 0;

  function increment() {
    count++;
  }
</script>

<template>
  <main class="card">
    <p class="eyebrow">FluxDOM starter</p>
    <h1>Compiler-first UI experiments</h1>
    <button @click="increment">Count: {count}</button>
  </main>
</template>

<style scoped>
  .card { max-width: 36rem; margin: 5rem auto; font-family: system-ui, sans-serif; }
  .eyebrow { color: #635bff; font-weight: 700; text-transform: uppercase; }
  button { border: 0; border-radius: 0.75rem; padding: 0.8rem 1rem; cursor: pointer; }
</style>
`);

  log(`Created FluxDOM starter in ${root}`);
  log(`Next: cd ${requestedPath} && npm install && npm run dev`);
  return root;
}

function write(root: string, relativePath: string, contents: string): void {
  const destination = resolve(root, relativePath);
  mkdirSync(resolve(destination, '..'), { recursive: true });
  writeFileSync(destination, contents, { encoding: 'utf8', flag: 'wx' });
}

function toPackageName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');
  return normalized || 'my-flow-app';
}
