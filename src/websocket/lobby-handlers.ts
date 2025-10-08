import { Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/socket';
import { prisma, getLobbyState, createSystemMessage, checkLobbyState } from '../utils/database';
import { startGame } from './game-handlers';
import { validateSocketData, joinLobbySchema } from '../schemas/validation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export const handleJoinLobby = async (socket: SocketType, data: Parameters<ClientToServerEvents['join_lobby']>[0], io: any) => {
  try {
    // Validate data
    const validation = validateSocketData(joinLobbySchema, data, 'join_lobby');
    if (!validation.success) {
      socket.emit('error', { message: validation.error });
      metrics.increment('join_lobby_validation_errors');
      return;
    }

    const { lobbyId, userId, sessionId, username } = validation.data;

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        players: {
          include: { user: true }
        },
        host: true
      }
    });

    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.status === 'PLAYING') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (lobby.status === 'FINISHED') {
      socket.emit('error', { message: 'Lobby has ended' });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    const existingPlayer = lobby.players.find(p =>
      (userId && p.userId === userId) || (sessionId && p.sessionId === sessionId)
    );

    let player;
    if (existingPlayer) {
      player = existingPlayer;
    } else {
      player = await prisma.lobbyPlayer.create({
        data: {
          lobbyId,
          userId,
          sessionId,
          username,
          avatar: data.avatar || '🎮'
        },
        include: { user: true }
      });
    }

    socket.join(`lobby_${lobbyId}`);
    socket.data.lobbyId = lobbyId;
    socket.data.playerId = player.id;
    socket.data.userId = userId || undefined;

    const updatedLobby = await getLobbyState(lobbyId);
    socket.emit('lobby_joined', updatedLobby!);

    socket.to(`lobby_${lobbyId}`).emit('player_joined', {
      player: {
        id: player.id,
        userId: player.userId,
        sessionId: player.sessionId,
        username: player.username,
        avatar: player.avatar,
        score: player.score,
        isReady: player.isReady,
        isEliminated: player.isEliminated,
        streak: player.streak
      } as any
    });

    await createSystemMessage(lobbyId, `${username} joined the game`, io);

    metrics.increment('players_joined');
    logger.info('Player joined lobby', {
      socketId: socket.id,
      lobbyId,
      playerId: player.id,
      username
    });

  } catch (error) {
    metrics.increment('join_lobby_errors');
    logger.error('Error joining lobby', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    socket.emit('error', { message: 'Failed to join lobby' });
  }
};

export const handleLeaveLobby = async (socket: SocketType, io?: any) => {
  try {
    if (socket.data.lobbyId && socket.data.playerId) {
      const player = await prisma.lobbyPlayer.findUnique({
        where: { id: socket.data.playerId }
      });

      if (player) {
        await prisma.lobbyPlayer.delete({
          where: { id: socket.data.playerId }
        });

        socket.to(`lobby_${socket.data.lobbyId}`).emit('player_left', {
          playerId: socket.data.playerId,
          username: player.username
        });

        await createSystemMessage(socket.data.lobbyId, `${player.username} left the game`, io);

        await checkLobbyState(socket.data.lobbyId, io);
      }

      socket.leave(`lobby_${socket.data.lobbyId}`);
      socket.data.lobbyId = undefined;
      socket.data.playerId = undefined;
    }
  } catch (error) {
    console.error('Error leaving lobby:', error);
  }
};

export const handlePlayerReady = async (socket: SocketType, data: Parameters<ClientToServerEvents['player_ready']>[0], io: any) => {
  try {
    const { isReady } = data;

    if (!socket.data.playerId || !socket.data.lobbyId) return;

    await prisma.lobbyPlayer.update({
      where: { id: socket.data.playerId },
      data: { isReady }
    });

    io.to(`lobby_${socket.data.lobbyId}`).emit('player_ready_changed', {
      playerId: socket.data.playerId,
      isReady
    });

    const lobby = await prisma.lobby.findUnique({
      where: { id: socket.data.lobbyId },
      include: { players: true }
    });

    if (!lobby) return;

    console.log('Checking auto start conditions:', {
      totalPlayers: lobby.players.length,
      activePlayers: lobby.players.filter(p => !p.isEliminated).length,
      playersReady: lobby.players.map(p => ({ username: p.username, isReady: p.isReady, isEliminated: p.isEliminated })),
      lobbyStatus: lobby.status
    });

    const activePlayers = lobby.players.filter(p => !p.isEliminated);
    const allReady = activePlayers.length >= 2 && activePlayers.every(p => p.isReady);
    console.log('All players ready:', allReady);

    if (allReady && lobby.status === 'WAITING') {
      console.log('Starting game countdown for lobby:', socket.data.lobbyId);
      socket.to(`lobby_${socket.data.lobbyId}`).emit('game_starting', { countdown: 5 });
      socket.emit('game_starting', { countdown: 5 });
      setTimeout(() => {
        console.log('Starting game for lobby:', socket.data.lobbyId);
        if (socket.data.lobbyId) {
          startGame(socket.data.lobbyId, io);
        }
      }, 5000);
    }

  } catch (error) {
    console.error('Error updating ready status:', error);
  }
};

export const handleDisconnect = async (socket: SocketType, io?: any) => {
  console.log('User disconnected:', socket.id);

  try {
    if (socket.data.lobbyId && socket.data.playerId) {
      const player = await prisma.lobbyPlayer.findUnique({
        where: { id: socket.data.playerId }
      });

      if (player) {
        await prisma.lobbyPlayer.delete({
          where: { id: socket.data.playerId }
        });

        socket.to(`lobby_${socket.data.lobbyId}`).emit('player_left', {
          playerId: socket.data.playerId,
          username: player.username
        });

        await createSystemMessage(socket.data.lobbyId, `${player.username} disconnected`, io);
        await checkLobbyState(socket.data.lobbyId, io);
      }
    }
  } catch (error) {
    console.error('Error handling disconnect:', error);
  }
};