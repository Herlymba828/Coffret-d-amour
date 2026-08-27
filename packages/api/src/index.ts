import http from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { createApp } from './app.js';
import { ensureBucket } from './services/storage.js';
import { pool } from './db/pool.js';
import { setupChatSocket } from './socket/chat.js';

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigin, credentials: true },
  path: '/chat',
});

app.set('io', io);
setupChatSocket(io);

async function start() {
  try {
    await ensureBucket();
  } catch (err) {
    console.warn('Storage bucket not ready (MinIO may be offline):', (err as Error).message);
  }

  server.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
    console.log(`WebSocket on ws://localhost:${config.port}/chat`);
  });
}

// Filet de sécurité : on journalise au lieu de laisser Node tuer le process
// sur une promesse orpheline (Express 4 n'attrape pas les handlers async).
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} reçu — arrêt en cours…`);
  io.close();
  server.close();
  await pool.end().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start();
