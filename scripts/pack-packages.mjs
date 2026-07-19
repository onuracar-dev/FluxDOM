import { runNpm } from './run-npm.mjs';

const packages = [
  '@fluxdom/compiler',
  '@fluxdom/runtime',
  '@fluxdom/server',
  '@fluxdom/router',
  '@fluxdom/store',
  '@fluxdom/vite-plugin',
  '@fluxdom/cli',
];

for (const workspace of packages) {
  const status = runNpm(['pack', '--dry-run', '--workspace', workspace]);
  if (status !== 0) process.exit(status);
}
