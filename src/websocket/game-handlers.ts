import { Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, SocketData } from '../types/socket';
import { prisma, createSystemMessage } from '../utils/database';
import { calculatePoints } from '../utils/game-utils';

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

// Store round timers
export const roundTimers = new Map<string, NodeJS.Timeout>();

export const startGame = async (lobbyId: string, io: any) => {
  try {
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        status: 'PLAYING',
        currentRound: 1
      }
    });

    await createSystemMessage(lobbyId, 'Game started! Get ready for the first round.');

    io.to(`lobby_${lobbyId}`).emit('game_started');

    // Start first round
    setTimeout(() => startRound(lobbyId, 1, io), 2000);

  } catch (error) {
    console.error('Error starting game:', error);
  }
};

export const startRound = async (lobbyId: string, roundNumber: number, io: any) => {
  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId }
    });

    if (!lobby) return;

    // Get images already used in this lobby to avoid repetition
    const usedImageIds = await prisma.multiplayerGameRound.findMany({
      where: { lobbyId },
      select: { imageId: true }
    }).then(rounds => rounds.map(round => round.imageId));

    // Get available images (excluding used ones if any)
    const whereClause = usedImageIds.length > 0 ? { id: { notIn: usedImageIds } } : {};

    // Count available images
    const availableCount = await prisma.dailyImage.count({ where: whereClause });

    // If no available images (used all), reset and use any image
    let randomImage;
    if (availableCount === 0) {
      const totalCount = await prisma.dailyImage.count();
      randomImage = await prisma.dailyImage.findFirst({
        skip: Math.floor(Math.random() * totalCount)
      });
    } else {
      // Get a random unused image
      randomImage = await prisma.dailyImage.findFirst({
        where: whereClause,
        skip: Math.floor(Math.random() * availableCount)
      });
    }

    // Safety check: ensure we have a valid image
    if (!randomImage) {
      console.error('No image found for round:', lobbyId, roundNumber);
      throw new Error('No images available for the game');
    }

    console.log(`Round ${roundNumber} for lobby ${lobbyId}: Using image ${randomImage.id}`);

    const round = await prisma.multiplayerGameRound.create({
      data: {
        lobbyId,
        roundNumber,
        imageId: randomImage.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        timerEndsAt: new Date(Date.now() + lobby.roundTimer * 1000)
      },
      include: { image: true }
    });

    io.to(`lobby_${lobbyId}`).emit('round_started', {
      roundNumber,
      image: {
        url: round.image.cloudinaryUrl,
        description: round.image.description
      },
      timer: lobby.roundTimer,
      hintsEnabled: lobby.hintsEnabled
    });

    // Set round timer
    const timerId = setTimeout(() => {
      endRound(lobbyId, round.id, io);
    }, lobby.roundTimer * 1000);

    roundTimers.set(round.id, timerId);

    // Optional hints
    if (lobby.hintsEnabled) {
      setTimeout(() => {
        if (round.image.tip) {
          // tip is already a JSON object with localized content like {pt:"tip in pt",en:"tip in en"}
          const localizedTips = round.image.tip as Record<string, string>;
          io.to(`lobby_${lobbyId}`).emit('hint_available', { hint: localizedTips });
        }
      }, (lobby.roundTimer * 1000) / 2); // Hint at halfway point
    }

  } catch (error) {
    console.error('Error starting round:', error);
  }
};

export const endRound = async (lobbyId: string, roundId: string, io: any) => {
  try {
    const timer = roundTimers.get(roundId);
    if (timer) {
      clearTimeout(timer);
      roundTimers.delete(roundId);
    }

    await prisma.multiplayerGameRound.update({
      where: { id: roundId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      }
    });

    const round = await prisma.multiplayerGameRound.findUnique({
      where: { id: roundId },
      include: {
        image: true,
        guesses: {
          include: { player: true }
        }
      }
    });

    if (!round) return;

    // Update player scores and streaks
    for (const guess of round.guesses) {
      const isAccurate = guess.accuracy <= 5; // Within 5 years is considered accurate

      await prisma.lobbyPlayer.update({
        where: { id: guess.playerId },
        data: {
          score: { increment: guess.points + guess.speedBonus },
          streak: isAccurate ? { increment: 1 } : 0
        }
      });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: { players: { orderBy: { score: 'desc' } } }
    });

    if (!lobby) return;

    // Handle elimination mode
    if (lobby.gameMode === 'ELIMINATION' && round.guesses.length > 1) {
      const worstGuess = round.guesses.reduce((worst, current) =>
        current.accuracy > worst.accuracy ? current : worst
      );

      await prisma.lobbyPlayer.update({
        where: { id: worstGuess.playerId },
        data: { isEliminated: true }
      });
    }

    // Check if game should continue
    const activePlayers = lobby.players.filter(p => !p.isEliminated);
    const shouldContinue =
      (lobby.gameMode === 'CLASSIC' && lobby.currentRound < lobby.rounds) ||
      (lobby.gameMode === 'ELIMINATION' && activePlayers.length > 1) ||
      (lobby.gameMode === 'MARATHON' && !lobby.players.some(p => p.score >= (lobby.targetScore || 1000)));

    io.to(`lobby_${lobbyId}`).emit('round_ended', {
      correctYear: round.image.year,
      guesses: round.guesses.map(g => ({
        player: g.player.username,
        year: g.year,
        points: g.points,
        speedBonus: g.speedBonus,
        accuracy: g.accuracy
      })),
      leaderboard: lobby.players.map(p => ({
        username: p.username,
        score: p.score,
        streak: p.streak,
        isEliminated: p.isEliminated
      })),
      nextRoundCountdown: shouldContinue ? lobby.betweenRoundsTimer : null
    });

    if (shouldContinue) {
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { currentRound: { increment: 1 } }
      });

      setTimeout(() => startRound(lobbyId, lobby.currentRound + 1, io), lobby.betweenRoundsTimer * 1000);
    } else {
      await endGame(lobbyId, io);
    }

  } catch (error) {
    console.error('Error ending round:', error);
  }
};

export const endGame = async (lobbyId: string, io: any) => {
  try {
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: { status: 'FINISHED' }
    });

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        players: {
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!lobby) return;

    io.to(`lobby_${lobbyId}`).emit('game_ended', {
      finalLeaderboard: lobby.players.map((p, index) => ({
        position: index + 1,
        username: p.username,
        score: p.score,
        streak: p.streak
      }))
    });

    await createSystemMessage(lobbyId, `Game finished! Winner: ${lobby.players[0]?.username || 'Unknown'}`);

  } catch (error) {
    console.error('Error ending game:', error);
  }
};

export const handleSubmitGuess = async (socket: SocketType, data: Parameters<ClientToServerEvents['submit_guess']>[0]) => {
  try {
    const { year } = data;

    if (!socket.data.lobbyId || !socket.data.playerId) return;

    const round = await prisma.multiplayerGameRound.findFirst({
      where: {
        lobbyId: socket.data.lobbyId,
        status: 'ACTIVE'
      },
      include: { image: true }
    });

    if (!round) {
      socket.emit('error', { message: 'No active round' });
      return;
    }

    // Check if player already guessed
    const existingGuess = await prisma.multiplayerGuess.findUnique({
      where: {
        roundId_playerId: {
          roundId: round.id,
          playerId: socket.data.playerId
        }
      }
    });

    if (existingGuess) {
      socket.emit('error', { message: 'Already submitted guess for this round' });
      return;
    }

    const pointsData = calculatePoints(year, round.image.year, round.startedAt?.getTime() || Date.now());

    await prisma.multiplayerGuess.create({
      data: {
        roundId: round.id,
        playerId: socket.data.playerId,
        year,
        points: pointsData.points,
        speedBonus: pointsData.speedBonus,
        accuracy: pointsData.accuracy
      }
    });

    socket.emit('guess_submitted', { success: true });

    // Check if all players have guessed
    const allGuesses = await prisma.multiplayerGuess.findMany({
      where: { roundId: round.id },
      include: { player: true }
    });

    const activePlayers = await prisma.lobbyPlayer.findMany({
      where: {
        lobbyId: socket.data.lobbyId,
        isEliminated: false
      }
    });

    if (allGuesses.length === activePlayers.length) {
      // Will need io instance here - we'll pass it from the main handler
      console.log('All players have guessed, ending round:', round.id);
    }

  } catch (error) {
    console.error('Error submitting guess:', error);
  }
};