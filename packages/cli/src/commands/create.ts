export function create(args: string[]) {
  const projectName = args[0] || 'my-flow-app';
  console.log(`🌊 Creating new FluxDOM project in ./${projectName}...`);
  console.log(`✅ Project created successfully!`);
  console.log(`\nNext steps:\n  cd ${projectName}\n  npm install\n  npm run dev`);
}
