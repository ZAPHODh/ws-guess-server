export interface Player {
  id: string;
  userId?: string;
  sessionId?: string;
  username: string;
  avatar: string;
  score: number;
  isReady: boolean;
  isEliminated: boolean;
  streak: number;
}

export interface Lobby {
  id: string;
  hostUserId: string;
  gameMode: 'CLASSIC' | 'ELIMINATION' | 'MARATHON';
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  maxPlayers: number;
  currentRound: number;
  rounds: number;
  roundTimer: number;
  betweenRoundsTimer: number;
  hintsEnabled: boolean;
  targetScore?: number;
  players: Player[];
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameRound {
  id: string;
  lobbyId: string;
  roundNumber: number;
  imageId: string;
  status: 'ACTIVE' | 'COMPLETED';
  startedAt: Date;
  endedAt?: Date;
  timerEndsAt: Date;
  image: {
    id: string;
    cloudinaryUrl: string;
    description: string;
    year: number;
    tip?: string;
  };
}

export interface Guess {
  id: string;
  roundId: string;
  playerId: string;
  year: number;
  points: number;
  speedBonus: number;
  accuracy: number;
  player: Player;
}

export interface ChatMessage {
  id: string;
  lobbyId: string;
  playerId?: string;
  username: string;
  message: string;
  type: 'CHAT' | 'SYSTEM';
  createdAt: Date;
}

export interface Reaction {
  id: string;
  lobbyId: string;
  playerId: string;
  roundId?: string;
  emoji: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
}