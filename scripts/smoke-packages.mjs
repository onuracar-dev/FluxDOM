import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { runNpm } from './run-npm.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = resolve(tmpdir());
const qaRoot = await mkdtemp(join(temporaryRoot, 'fluxdom-consumer-qa-'));
const tarballDirectory = join(qaRoot, 'tarballs');
const consumerDirectory = join(qaRoot, 'consumer');
const workspaces = [
  '@fluxdom/compiler',
  '@fluxdom/runtime',
  '@fluxdom/server',
  '@fluxdom/router',
  '@fluxdom/store',
  '@fluxdom/vite-plugin',
  '@fluxdom/cli',
];

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? 'unknown'}`);
  }
  return result;
}

try {
  await mkdir(tarballDirectory);
  await mkdir(consumerDirectory);

  for (const workspace of workspaces) {
    const status = runNpm(
      ['pack', '--loglevel=silent', '--pack-destination', tarballDirectory, '--workspace', workspace],
      { cwd: repositoryRoot },
    );
    if (status !== 0) throw new Error(`npm pack failed for ${workspace}`);
  }

  const tarballs = (await readdir(tarballDirectory))
    .filter((filename) => filename.endsWith('.tgz'))
    .map((filename) => join(tarballDirectory, filename));
  assert.equal(tarballs.length, workspaces.length, 'all public workspaces must produce one tarball');

  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify({ name: 'fluxdom-release-consumer', private: true, type: 'module' }, null, 2)}\n`,
  );
  const installStatus = runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...tarballs, 'vite@8.1.5'],
    { cwd: consumerDirectory },
  );
  if (installStatus !== 0) throw new Error('consumer npm install failed');
  const installedBins = await readdir(join(consumerDirectory, 'node_modules', '.bin'));
  assert.ok(
    installedBins.some((filename) => /^flow(?:\.cmd|\.ps1)?$/.test(filename)),
    'the CLI tarball must install a flow executable',
  );

  const smokeModule = join(consumerDirectory, 'smoke.mjs');
  await writeFile(
    smokeModule,
    `import assert from 'node:assert/strict';
import { compileSource } from '@fluxdom/compiler';
import { createEffect, createSignal } from '@fluxdom/runtime';
import { renderToString as renderServer } from '@fluxdom/server';
import { matchRoute } from '@fluxdom/router';
import { store } from '@fluxdom/store';
import { flowPlugin } from '@fluxdom/vite-plugin';
import { renderToString as renderFlow } from '@fluxdom/vite-plugin/ssr';
import { build } from 'vite';

const staticSource = \`<template><main class="card"><h1>Hello &amp; FluxDOM</h1></main></template><style scoped>.card { color: rebeccapurple; }</style>\`;
const compiled = compileSource(staticSource, 'Smoke.flow');
assert.match(compiled.js, /export const __flowStrategy/);
assert.match(compiled.css, /data-fluxdom=/);

const [count, setCount] = createSignal(1);
const observations = [];
const dispose = createEffect(() => observations.push(count()));
setCount(2);
dispose();
setCount(3);
assert.deepEqual(observations, [1, 2]);

const escaped = renderServer((operations) => operations.createText('<unsafe>'));
assert.equal(escaped, '<div id="app">&lt;unsafe&gt;</div>');
const staticRender = renderFlow(staticSource, 'Smoke.flow');
assert.equal(staticRender.rendered, true);
assert.match(staticRender.html, /<h1>Hello &amp;amp; FluxDOM<\\/h1>/);

const route = { path: '/users/[id]', component: async () => ({}) };
assert.equal(matchRoute('https://example.test/users/42?tab=profile', [route])?.params.id, '42');

const counter = store({
  name: 'consumer-smoke',
  state: { count: 1 },
  actions: { increment() { this.count += 1; } },
});
counter.increment();
assert.equal(counter.count(), 2);

const plugin = flowPlugin();
assert.equal(plugin.name, 'vite-plugin-FluxDOM');
const transformed = await plugin.transform.call(
  { error(error) { throw new Error(error.message); } },
  staticSource,
  '/Smoke.flow',
);
assert.match(transformed.code, /Smoke\\.flow\\.css/);

const virtualEntry = {
  name: 'consumer-entry',
  resolveId(id) { return id === 'virtual:entry' ? '\\0virtual:entry' : null; },
  load(id) {
    if (id !== '\\0virtual:entry') return null;
    return \`import { createSignal } from '@fluxdom/runtime'; import { matchRoute } from '@fluxdom/router'; import { store } from '@fluxdom/store'; const [read] = createSignal(1); console.log(read(), matchRoute, store);\`;
  },
};
await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [virtualEntry],
  build: { outDir: 'bundle', emptyOutDir: true, rollupOptions: { input: 'virtual:entry' } },
});

console.log('module_smoke=ok');
console.log('vite_bundle=ok');
`,
  );
  run(process.execPath, [smokeModule], { cwd: consumerDirectory });

  await writeFile(
    join(consumerDirectory, 'index.html'),
    '<!doctype html><html><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>\n',
  );
  await writeFile(
    join(consumerDirectory, 'main.js'),
    "import { createSignal } from '@fluxdom/runtime'; const [read] = createSignal('cli'); document.querySelector('#app').textContent = read();\n",
  );
  const directCliEnvironment = { ...process.env };
  delete directCliEnvironment.npm_execpath;
  run(process.execPath, [join(consumerDirectory, 'node_modules/@fluxdom/cli/dist/index.js'), 'build'], {
    cwd: consumerDirectory,
    env: directCliEnvironment,
  });

  const cliResult = run(process.execPath, [join(consumerDirectory, 'node_modules/@fluxdom/cli/dist/index.js')], {
    cwd: consumerDirectory,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  assert.match(cliResult.stdout, /FluxDOM CLI/);
  assert.match(cliResult.stdout, /flow create/);

  const bundleFiles = await readdir(join(consumerDirectory, 'bundle'));
  console.log(`tarballs=${tarballs.length}`);
  console.log('cli_smoke=ok');
  console.log('cli_bin_smoke=ok');
  console.log('cli_build_smoke=ok');
  console.log(`bundle_files=${bundleFiles.length}`);
} finally {
  const resolvedQaRoot = resolve(qaRoot);
  const safePrefix = `${temporaryRoot}${sep}`;
  if (!resolvedQaRoot.startsWith(safePrefix) || !basename(resolvedQaRoot).startsWith('fluxdom-consumer-qa-')) {
    throw new Error(`Refusing to clean unsafe QA path: ${resolvedQaRoot}`);
  }
  await rm(resolvedQaRoot, { recursive: true, force: true });
}
