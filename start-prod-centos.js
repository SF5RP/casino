const { spawn } = require('child_process');

console.log('🚀 Starting Next.js production server...');

const nextApp = spawn('npm', ['run', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000
  },
  shell: true
});

nextApp.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping Next.js...');
  nextApp.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping Next.js...');
  nextApp.kill('SIGTERM');
}); 