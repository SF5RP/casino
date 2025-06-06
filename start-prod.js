const { spawn } = require('child_process');
const config = require('./config');

console.log('🚀 Запуск приложения рулетки (PRODUCTION)...\n');

// В продакшене сначала собираем приложение
console.log('🔨 Сборка Next.js приложения...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Ошибка при сборке приложения');
    process.exit(1);
  }
  
  console.log('✅ Сборка завершена успешно\n');
  
  // Запускаем WebSocket сервер
  console.log(`📡 Запуск WebSocket сервера на порту ${config.WS_PORT}...`);
  const wsServer = spawn('node', ['wsServer.js'], {
    stdio: 'pipe',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      WS_PORT: config.WS_PORT 
    }
  });

  // Запускаем продакшен версию Next.js
  console.log(`🌐 Запуск Next.js приложения на порту ${config.APP_PORT}...`);
  const nextApp = spawn('npm', ['run', 'start'], {
    stdio: 'pipe',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: config.APP_PORT,
      NEXT_PUBLIC_WS_PORT: config.WS_PORT,
      NEXT_PUBLIC_WS_HOST: process.env.WS_HOST || 'localhost',
      NEXT_PUBLIC_WS_PROTOCOL: process.env.WS_PROTOCOL || 'ws'
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
    if (output) {
      console.error(`[NEXT ERROR] ${output}`);
    }
  });

  // Обработка завершения процессов
  wsServer.on('close', (code) => {
    console.log(`\n❌ WebSocket сервер завершился с кодом ${code}`);
    nextApp.kill();
    process.exit(code);
  });

  nextApp.on('close', (code) => {
    console.log(`\n❌ Next.js приложение завершилось с кодом ${code}`);
    wsServer.kill();
    process.exit(code);
  });

  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал завершения. Останавливаем сервисы...');
    wsServer.kill('SIGINT');
    nextApp.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM. Останавливаем сервисы...');
    wsServer.kill('SIGTERM');
    nextApp.kill('SIGTERM');
  });

  console.log('\n✅ Приложение запущено в продакшен режиме!');
  console.log(`🌐 Next.js приложение: http://localhost:${config.APP_PORT}`);
  console.log(`📡 WebSocket сервер: ws://localhost:${config.WS_PORT}`);
  console.log('\n💡 Для остановки нажмите Ctrl+C\n');
}); 