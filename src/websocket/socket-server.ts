import { Server } from 'socket.io';
import { createServer } from 'http';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../types/socket';
import {
  handleJoinLobby,
  handleLeaveLobby,
  handlePlayerReady,
  handleDisconnect
} from './lobby-handlers';
import {
  handleSubmitGuess,
  endRound,
  roundTimers
} from './game-handlers';
import {
  handleSendMessage,
  handleSendReaction
} from './chat-handlers';
import {
  handleStartGame,
  handleUpdateLobbySettings,
  handleRestartGame,
  handleKickPlayer,
  handleTransferHost
} from './admin-handlers';

export function createSocketServer() {
  const server = createServer();

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socket',
    transports: ['websocket', 'polling']
  });

  // Store active lobbies and timers
  const activeLobbies = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Lobby events
    socket.on('join_lobby', (data) => handleJoinLobby(socket, data));
    socket.on('leave_lobby', () => handleLeaveLobby(socket, io));
    socket.on('player_ready', (data) => handlePlayerReady(socket, data, io));

    // Game events
    socket.on('start_game', () => handleStartGame(socket, io));
    socket.on('submit_guess', async (data) => {
      await handleSubmitGuess(socket, data);

      // Check if all players have guessed after handling the guess
      if (socket.data.lobbyId && socket.data.playerId) {
        const round = await require('../utils/database').prisma.multiplayerGameRound.findFirst({
          where: {
            lobbyId: socket.data.lobbyId,
            status: 'ACTIVE'
          }
        });

        if (round) {
          const allGuesses = await require('../utils/database').prisma.multiplayerGuess.findMany({
            where: { roundId: round.id }
          });

          const activePlayers = await require('../utils/database').prisma.lobbyPlayer.findMany({
            where: {
              lobbyId: socket.data.lobbyId,
              isEliminated: false
            }
          });

          if (allGuesses.length === activePlayers.length) {
            await endRound(socket.data.lobbyId, round.id, io);
          }
        }
      }
    });

    // Admin events
    socket.on('update_lobby_settings', (data) => handleUpdateLobbySettings(socket, data));
    socket.on('restart_game', () => handleRestartGame(socket));
    socket.on('kick_player', (data) => handleKickPlayer(socket, data, io));
    socket.on('transfer_host', (data) => handleTransferHost(socket, data));

    // Chat events
    socket.on('send_message', (data) => handleSendMessage(socket, data));
    socket.on('send_reaction', (data) => handleSendReaction(socket, data));

    // Disconnect
    socket.on('disconnect', () => handleDisconnect(socket, io));
  });

  return { server, io };
}