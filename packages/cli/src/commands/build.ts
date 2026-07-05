import { execSync } from 'child_process';

export function build(args: string[]) {
  console.log(`🌊 Building FluxDOM project for production...`);
  try {
    execSync('npx vite build', { stdio: 'inherit' });
    console.log(`✅ Build complete!`);
  } catch (err) {
    console.error('Build failed', err);
  }
}
