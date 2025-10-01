import { PrismaClient } from '@prisma/client';
import { Lobby, Player, ChatMessage } from '../types/lobby';

export const prisma = new PrismaClient();

export const getLobbyState = async (lobbyId: string): Promise<Lobby | null> => {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      players: {
        include: { user: true }
      },
      host: true,
      chatMessages: {
        orderBy: { createdAt: 'asc' },
        take: 50
      }
    }
  });

  if (lobby) {
    (lobby as any).players = lobby.players.map(player => ({
      id: player.id,
      userId: player.userId,
      sessionId: player.sessionId,
      username: player.username,
      avatar: player.avatar,
      score: player.score,
      isReady: player.isReady,
      isEliminated: player.isEliminated,
      streak: player.streak
    }));
  }

  return lobby as Lobby | null;
};

export const createSystemMessage = async (lobbyId: string, message: string): Promise<ChatMessage> => {
  return await prisma.lobbyMessage.create({
    data: {
      lobbyId,
      username: 'System',
      message,
      type: 'SYSTEM'
    }
  }) as ChatMessage;
};

export const checkLobbyState = async (lobbyId: string, io?: any): Promise<void> => {
  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        players: true,
        host: true
      }
    });

    if (!lobby) return;

    // If lobby has no players, end it
    if (lobby.players.length === 0) {
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'FINISHED' }
      });

      console.log(`Ended empty lobby: ${lobbyId}`);


      if (io) {
        io.to(`lobby_${lobbyId}`).emit('lobby_finished', {
          lobbyId,
          reason: 'No players remaining'
        });
      }

      return;
    }

    // If only 1 player left and game is in progress, end the game
    if (lobby.players.length === 1 && lobby.status === 'PLAYING') {
      // Will need to import endGame function here or pass it as parameter
      console.log(`Need to end game for lobby ${lobbyId} - only 1 player remaining`);
      return;
    }

    // If host left and lobby is waiting, transfer host to first player
    const hostStillInLobby = lobby.players.some(p => p.userId === lobby.hostUserId);
    if (!hostStillInLobby && lobby.status === 'WAITING' && lobby.players.length > 0) {
      const newHost = lobby.players[0];

      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { hostUserId: newHost.userId || 'anonymous' }
      });

      // Update new host's avatar to crown
      await prisma.lobbyPlayer.update({
        where: { id: newHost.id },
        data: { avatar: '👑' }
      });

      console.log(`${newHost.username} is now the host of lobby ${lobbyId}`);
      await createSystemMessage(lobbyId, `${newHost.username} is now the host`);
    }
  } catch (error) {
    console.error('Error checking lobby state:', error);
  }
};