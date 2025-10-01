import { Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/socket';
import { prisma, createSystemMessage } from '../utils/database';
import { startGame } from './game-handlers';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export const handleStartGame = async (socket: SocketType, io: any) => {
  try {
    if (!socket.data.lobbyId || !socket.data.userId) return;

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby) return;

    if (lobby.hostUserId !== socket.data.userId) {
      socket.emit('error', { message: 'Only host can start the game' });
      return;
    }

    if (lobby.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    await startGame(socket.data.lobbyId, io);
  } catch (error) {
    console.error('Error starting game:', error);
  }
};

export const handleUpdateLobbySettings = async (socket: SocketType, data: Parameters<ClientToServerEvents['update_lobby_settings']>[0]) => {
  try {
    if (!socket.data.lobbyId || !socket.data.userId) return;

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby) return;

    if (lobby.hostUserId !== socket.data.userId) {
      socket.emit('error', { message: 'Only host can update lobby settings' });
      return;
    }

    if (lobby.status !== 'WAITING') {
      socket.emit('error', { message: 'Cannot update settings during game' });
      return;
    }

    const updatedLobby = await prisma.lobby.update({
      where: { id: socket.data.lobbyId },
      data: {
        gameMode: data.gameMode,
        roundTimer: data.roundTimer,
        rounds: data.rounds,
        hintsEnabled: data.hintsEnabled,
        maxPlayers: data.maxPlayers
      },
      include: {
        players: true,
        host: true
      }
    });

  
    socket.to(`lobby_${socket.data.lobbyId}`).emit('lobby_updated', {
      lobby: updatedLobby as any
    });
    socket.emit('lobby_updated', {
      lobby: updatedLobby as any
    });


    await createSystemMessage(socket.data.lobbyId, 'Host updated game settings');

  } catch (error) {
    console.error('Error updating lobby settings:', error);
    socket.emit('error', { message: 'Failed to update lobby settings' });
  }
};

export const handleRestartGame = async (socket: SocketType) => {
  try {
    if (!socket.data.lobbyId || !socket.data.userId) return;

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby) return;

    if (lobby.hostUserId !== socket.data.userId) {
      socket.emit('error', { message: 'Only host can restart the game' });
      return;
    }

    if (lobby.status !== 'FINISHED') {
      socket.emit('error', { message: 'Can only restart finished games' });
      return;
    }

    await prisma.lobby.update({
      where: { id: socket.data.lobbyId },
      data: {
        status: 'WAITING',
        currentRound: 0
      }
    });

    await prisma.lobbyPlayer.updateMany({
      where: { lobbyId: socket.data.lobbyId },
      data: {
        isReady: false,
        score: 0,
        streak: 0,
        isEliminated: false
      }
    });

    const rounds = await prisma.multiplayerGameRound.findMany({
      where: { lobbyId: socket.data.lobbyId },
      select: { id: true }
    });

    if (rounds.length > 0) {
      const roundIds = rounds.map(r => r.id);

      await prisma.multiplayerGuess.deleteMany({
        where: { roundId: { in: roundIds } }
      });

      await prisma.multiplayerGameRound.deleteMany({
        where: { lobbyId: socket.data.lobbyId }
      });
    }

    const updatedLobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: {
        players: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    if (!updatedLobby) return;

    const resetData = {
      lobby: updatedLobby,
      players: updatedLobby.players,
      chatMessages: updatedLobby.chatMessages
    };

    socket.to(`lobby_${socket.data.lobbyId}`).emit('game_restarted', resetData as any);
    socket.emit('game_restarted', resetData as any);

    await createSystemMessage(socket.data.lobbyId, 'Host restarted the game');

  } catch (error) {
    console.error('Error restarting game:', error);
    socket.emit('error', { message: 'Failed to restart game' });
  }
};

export const handleKickPlayer = async (socket: SocketType, data: Parameters<ClientToServerEvents['kick_player']>[0], io: any) => {
  try {
    const { playerId } = data;

    if (!socket.data.lobbyId || !socket.data.userId) return;

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby || lobby.hostUserId !== socket.data.userId) {
      socket.emit('error', { message: 'Only the host can kick players' });
      return;
    }

    const playerToKick = await prisma.lobbyPlayer.findUnique({
      where: { id: playerId },
      include: { user: true }
    });

    if (!playerToKick) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    if (playerToKick.lobbyId !== socket.data.lobbyId) {
      socket.emit('error', { message: 'Player is not in this lobby' });
      return;
    }

    await prisma.lobbyPlayer.delete({
      where: { id: playerId }
    });

    await createSystemMessage(socket.data.lobbyId, `${playerToKick.username} was kicked from the lobby`);

    const sockets = await io.in(`lobby_${socket.data.lobbyId}`).fetchSockets();
    for (const playerSocket of sockets) {
      if (playerSocket.data.playerId === playerId) {
        playerSocket.leave(`lobby_${socket.data.lobbyId}`);
        playerSocket.emit('error', { message: 'You have been kicked from the lobby' });
        break;
      }
    }

    socket.to(`lobby_${socket.data.lobbyId}`).emit('player_left', {
      playerId: playerId,
      username: playerToKick.username
    });

  } catch (error) {
    console.error('Error kicking player:', error);
    socket.emit('error', { message: 'Failed to kick player' });
  }
};

export const handleTransferHost = async (socket: SocketType, data: Parameters<ClientToServerEvents['transfer_host']>[0]) => {
  try {
    const { playerId } = data;

    if (!socket.data.lobbyId || !socket.data.userId) return;

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby || lobby.hostUserId !== socket.data.userId) {
      socket.emit('error', { message: 'Only the host can transfer ownership' });
      return;
    }

    const targetPlayer = await prisma.lobbyPlayer.findUnique({
      where: { id: playerId }
    });

    if (!targetPlayer || !targetPlayer.userId) {
      socket.emit('error', { message: 'Target player not found or is a guest' });
      return;
    }

    await prisma.lobby.update({
      where: { id: socket.data.lobbyId },
      data: { hostUserId: targetPlayer.userId }
    });

    const transferData = {
      newHostUserId: targetPlayer.userId,
      newHostPlayerId: playerId
    };

    socket.to(`lobby_${socket.data.lobbyId}`).emit('host_transferred', transferData);
    socket.emit('host_transferred', transferData);

  } catch (error) {
    console.error('Error transferring host:', error);
    socket.emit('error', { message: 'Failed to transfer host' });
  }
};