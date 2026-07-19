import { runNpm } from './npm.js';

export function build(args: string[]): void {
  runNpm(['exec', 'vite', '--', 'build', ...args]);
}
