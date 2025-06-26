const {spawn} = require('child_process');
const config = require('./config');

console.log('🚀 Запуск Next.js приложения рулетки (PRODUCTION)...\n');

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

  // Запускаем только продакшен версию Next.js
  console.log(`🌐 Запуск Next.js приложения на порту ${config.APP_PORT}...`);
  const nextApp = spawn('npm', ['run', 'start'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
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
    if (output) {
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
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM. Останавливаем Next.js...');
    nextApp.kill('SIGTERM');
  });

  console.log('\n✅ Next.js приложение запущено в продакшен режиме!');
  console.log(`🌐 Приложение: http://localhost:${config.APP_PORT}`);
  console.log('📡 WebSocket подключение: Go Backend на порту 8080');
  console.log('\n💡 Для остановки нажмите Ctrl+C\n');
}); 