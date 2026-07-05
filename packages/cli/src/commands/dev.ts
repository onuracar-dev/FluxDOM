import { execSync } from 'child_process';

export function dev(args: string[]) {
  console.log(`🌊 Starting FluxDOM development server...`);
  try {
    // In reality this would run Vite programmatically
    // For now we'll execute it as a shell command
    execSync('npx vite', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to start dev server', err);
  }
}
