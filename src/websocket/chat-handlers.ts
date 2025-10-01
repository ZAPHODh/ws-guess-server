import { Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/socket';
import { prisma } from '../utils/database';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export const handleSendMessage = async (socket: SocketType, data: Parameters<ClientToServerEvents['send_message']>[0]) => {
  try {
    const { message, type = 'CHAT' } = data;

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

    // Broadcast to all players in the lobby including sender
    socket.to(`lobby_${socket.data.lobbyId}`).emit('new_message', chatMessage as any);
    socket.emit('new_message', chatMessage as any);

  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const handleSendReaction = async (socket: SocketType, data: Parameters<ClientToServerEvents['send_reaction']>[0]) => {
  try {
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

    // Broadcast reaction to all players in the lobby including sender
    const reactionData = {
      playerId: socket.data.playerId,
      emoji,
      targetType,
      targetId,
      roundId
    };

    socket.to(`lobby_${socket.data.lobbyId}`).emit('new_reaction', reactionData);
    socket.emit('new_reaction', reactionData);

  } catch (error) {
    console.error('Error sending reaction:', error);
  }
};