const { spawn } = require('child_process');
const config = require('./config');

console.log('🚀 Запуск Next.js приложения рулетки...\n');

// Запускаем только Next.js приложение
console.log(`🌐 Запуск Next.js приложения на порту ${config.APP_PORT}...`);
const nextApp = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  env: { 
    ...process.env, 
    PORT: config.APP_PORT
  },
  shell: true
});

// Обработка вывода Next.js приложения
nextApp.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log(`[NEXT] ${output}`);
  }
});

nextApp.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output && !output.includes('warn')) {
    console.error(`[NEXT ERROR] ${output}`);
  }
});

// Обработка завершения процесса
nextApp.on('close', (code) => {
  console.log(`\n❌ Next.js приложение завершилось с кодом ${code}`);
  process.exit(code);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал завершения. Останавливаем Next.js...');
  nextApp.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал SIGTERM. Останавливаем Next.js...');
  nextApp.kill('SIGTERM');
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

console.log('\n✅ Next.js приложение запущено!');
console.log(`🌐 Приложение: http://localhost:${config.APP_PORT}`);
console.log('📡 WebSocket подключение: Go Backend на порту 8080');
console.log('\n💡 Для остановки нажмите Ctrl+C\n'); 