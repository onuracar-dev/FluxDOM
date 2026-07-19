import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function resolveNpmInvocation(arguments_) {
  if (process.env.npm_execpath) {
    return [process.execPath, [process.env.npm_execpath, ...arguments_]];
  }

  if (process.platform === 'win32') {
    const bundledNpmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (existsSync(bundledNpmCli)) {
      return [process.execPath, [bundledNpmCli, ...arguments_]];
    }

    return ['npm.cmd', arguments_];
  }

  return ['npm', arguments_];
}

export function runNpm(arguments_, options = {}) {
  const [command, commandArguments] = resolveNpmInvocation(arguments_);
  const result = spawnSync(command, commandArguments, { stdio: 'inherit', ...options });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}
