const WebSocket = require('ws');
const config = require('./config');

const wss = new WebSocket.Server({ port: config.WS_PORT });

// In-memory store: { [key: string]: (number | '00')[] }
const store = {};
// key: string => Set of clients
const rooms = {};

wss.on('connection', (ws) => {
  let currentKey = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'join' && typeof data.key === 'string') {
        currentKey = data.key;
        if (!rooms[currentKey]) rooms[currentKey] = new Set();
        rooms[currentKey].add(ws);
        // Отправить текущую историю
        ws.send(JSON.stringify({ type: 'sync', history: store[currentKey] || [] }));
      }
      if (data.type === 'update' && currentKey && Array.isArray(data.history)) {
        store[currentKey] = data.history;
        // Рассылаем всем в комнате
        for (const client of rooms[currentKey]) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'sync', history: store[currentKey] }));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    if (currentKey && rooms[currentKey]) {
      rooms[currentKey].delete(ws);
      if (rooms[currentKey].size === 0) delete rooms[currentKey];
    }
  });
});

console.log(`WebSocket server started on ws://localhost:${config.WS_PORT}`); 