const http = require('http');
const crypto = require('crypto');
const {exec} = require('child_process');

// Конфигурация
const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret'; // Замените на ваш секрет
const DEPLOY_SCRIPT = '/opt/deploy-scripts/deploy-roulette.sh';

// Функция для проверки подписи GitHub
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, {'Content-Type': 'text/plain'});
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      // Проверяем подпись (если используется GitHub)
      const signature = req.headers['x-hub-signature-256'];
      if (signature && !verifySignature(body, signature)) {
        console.log('❌ Неверная подпись webhook');
        res.writeHead(401, {'Content-Type': 'text/plain'});
        res.end('Unauthorized');
        return;
      }

      const payload = JSON.parse(body);

      // Проверяем, что это push в main ветку
      if (payload.ref === 'refs/heads/main') {
        console.log('🚀 Получен webhook для main ветки, запускаем деплой...');

        // Запускаем скрипт деплоя
        exec(`sudo -u deploy ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Ошибка деплоя:', error);
            return;
          }
          console.log('✅ Деплой завершен:', stdout);
          if (stderr) console.log('Warnings:', stderr);
        });

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Deploy started');
      } else {
        console.log('ℹ️ Webhook для ветки', payload.ref, '- игнорируем');
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Ignored');
      }
    } catch (error) {
      console.error('❌ Ошибка обработки webhook:', error);
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎣 Webhook сервер запущен на порту ${PORT}`);
  console.log(`📝 Для настройки GitHub webhook используйте URL: http://your-server:${PORT}`);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем webhook сервер...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен SIGTERM, останавливаем сервер...');
  server.close(() => {
    process.exit(0);
  });
}); 