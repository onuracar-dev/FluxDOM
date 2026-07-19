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

const extraArguments = process.argv.slice(2);

for (const workspace of packages) {
  const status = runNpm(['publish', '--workspace', workspace, '--access', 'public', ...extraArguments]);

  if (status !== 0) {
    process.exit(status);
  }
}
