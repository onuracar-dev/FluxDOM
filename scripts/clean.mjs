import { rm } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const relativeTargets = [
  'packages/cli/dist',
  'packages/compiler/dist',
  'packages/devtools/dist',
  'packages/router/dist',
  'packages/runtime/dist',
  'packages/server/dist',
  'packages/store/dist',
  'packages/vite-plugin/dist',
  'apps/docs/dist',
  'examples/hello-world/dist',
];

for (const relativeTarget of relativeTargets) {
  const target = join(repositoryRoot, relativeTarget);
  if (!target.startsWith(`${repositoryRoot}${sep}`)) {
    throw new Error(`Refusing to clean a path outside the repository: ${target}`);
  }
  await rm(target, { recursive: true, force: true });
}
