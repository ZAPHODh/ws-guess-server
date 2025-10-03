import { Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/socket';
import { prisma } from '../utils/database';
import { validateSocketData, sendMessageSchema } from '../schemas/validation';
import { rateLimiter } from '../utils/rate-limiter';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export const handleSendMessage = async (socket: SocketType, data: Parameters<ClientToServerEvents['send_message']>[0]) => {
  const start = Date.now();

  try {
    // Rate limit: 5 messages per 10 seconds
    if (!rateLimiter.check(socket.id, { windowMs: 10000, maxRequests: 5 })) {
      socket.emit('error', { message: 'Rate limit exceeded. Please wait before sending more messages.' });
      metrics.increment('chat_rate_limited');
      return;
    }

    // Validate data
    const validation = validateSocketData(sendMessageSchema, data, 'send_message');
    if (!validation.success) {
      socket.emit('error', { message: validation.error });
      metrics.increment('chat_validation_errors');
      return;
    }

    const { message, type = 'CHAT' } = validation.data;

    if (!socket.data.lobbyId || !socket.data.playerId) return;

    const player = await prisma.lobbyPlayer.findUnique({
      where: { id: socket.data.playerId }
    });

    if (!player) return;

    const chatMessage = await prisma.lobbyMessage.create({
      data: {
        lobbyId: socket.data.lobbyId,
        playerId: socket.data.playerId,
        username: player.username,
        message,
        type
      }
    });

    socket.to(`lobby_${socket.data.lobbyId}`).emit('new_message', chatMessage as any);
    socket.emit('new_message', chatMessage as any);

    const duration = Date.now() - start;
    metrics.timing('chat_message_time', duration);
    metrics.increment('chat_messages_sent');

    logger.info('Message sent', {
      socketId: socket.id,
      lobbyId: socket.data.lobbyId,
      playerId: socket.data.playerId,
      type
    });

  } catch (error) {
    metrics.increment('chat_errors');
    logger.error('Error sending message', {
      socketId: socket.id,
      lobbyId: socket.data.lobbyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const handleSendReaction = async (socket: SocketType, data: Parameters<ClientToServerEvents['send_reaction']>[0]) => {
  try {
    // Rate limit: 10 reactions per 10 seconds
    if (!rateLimiter.check(`${socket.id}_reaction`, { windowMs: 10000, maxRequests: 10 })) {
      socket.emit('error', { message: 'Too many reactions. Please slow down.' });
      metrics.increment('reaction_rate_limited');
      return;
    }

    const { emoji, targetType, targetId, roundId } = data;

    if (!socket.data.lobbyId || !socket.data.playerId) return;

    await prisma.lobbyReaction.create({
      data: {
        lobbyId: socket.data.lobbyId,
        playerId: socket.data.playerId,
        roundId,
        emoji,
        targetType,
        targetId
      }
    });

    const reactionData = {
      playerId: socket.data.playerId,
      emoji,
      targetType,
      targetId,
      roundId
    };

    socket.to(`lobby_${socket.data.lobbyId}`).emit('new_reaction', reactionData);
    socket.emit('new_reaction', reactionData);

    metrics.increment('reactions_sent');

  } catch (error) {
    metrics.increment('reaction_errors');
    logger.error('Error sending reaction', {
      socketId: socket.id,
      lobbyId: socket.data.lobbyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};