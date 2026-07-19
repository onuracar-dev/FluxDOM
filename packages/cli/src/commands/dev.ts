import { runNpm } from './npm.js';

export function dev(args: string[]): void {
  runVite(args);
}

function runVite(args: string[]): void {
  runNpm(['exec', 'vite', '--', ...args]);
}
