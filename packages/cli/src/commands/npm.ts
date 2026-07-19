import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function resolveNpmInvocation(arguments_: string[]): [string, string[]] {
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

export function runNpm(arguments_: string[]): void {
  const [command, commandArguments] = resolveNpmInvocation(arguments_);
  const result = spawnSync(command, commandArguments, { stdio: 'inherit' });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
