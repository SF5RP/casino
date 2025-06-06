const { spawn } = require('child_process');
const config = require('./config');

console.log('🚀 Запуск приложения рулетки...\n');

// Запускаем WebSocket сервер
console.log(`📡 Запуск WebSocket сервера на порту ${config.WS_PORT}...`);
const wsServer = spawn('node', ['wsServer.js'], {
  stdio: 'pipe',
  env: { ...process.env, WS_PORT: config.WS_PORT }
});

// Запускаем Next.js приложение
console.log(`🌐 Запуск Next.js приложения на порту ${config.APP_PORT}...`);
const nextApp = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  env: { 
    ...process.env, 
    PORT: config.APP_PORT,
    NEXT_PUBLIC_WS_PORT: config.WS_PORT 
  },
  shell: true
});

// Обработка вывода WebSocket сервера
wsServer.stdout.on('data', (data) => {
  console.log(`[WS] ${data.toString().trim()}`);
});

wsServer.stderr.on('data', (data) => {
  console.error(`[WS ERROR] ${data.toString().trim()}`);
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

// Обработка завершения процессов
wsServer.on('close', (code) => {
  console.log(`\n❌ WebSocket сервер завершился с кодом ${code}`);
  if (code !== 0) {
    nextApp.kill();
    process.exit(1);
  }
});

nextApp.on('close', (code) => {
  console.log(`\n❌ Next.js приложение завершилось с кодом ${code}`);
  if (code !== 0) {
    wsServer.kill();
    process.exit(1);
  }
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал завершения. Останавливаем сервисы...');
  wsServer.kill('SIGINT');
  nextApp.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал SIGTERM. Останавливаем сервисы...');
  wsServer.kill('SIGTERM');
  nextApp.kill('SIGTERM');
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

console.log('\n✅ Оба сервиса запущены!');
console.log(`🌐 Next.js приложение: http://localhost:${config.APP_PORT}`);
console.log(`📡 WebSocket сервер: ws://localhost:${config.WS_PORT}`);
console.log('\n💡 Для остановки нажмите Ctrl+C\n'); 