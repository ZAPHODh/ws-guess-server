import dotenv from 'dotenv';
import { createSocketServer } from './websocket/socket-server';
import { cleanupAbandonedLobbies } from './utils/cleanup';
import { prisma } from './utils/database';

dotenv.config();

const { server, io } = createSocketServer();

const PORT = process.env.WS_PORT || 3001;

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);

  cleanupAbandonedLobbies();

  setInterval(cleanupAbandonedLobbies, 10 * 60 * 1000);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down WebSocket server...');
  await prisma.$disconnect();
  server.close();
});

process.on('SIGINT', async () => {
  console.log('Shutting down WebSocket server...');
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

export { server, io };