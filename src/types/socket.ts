import { Player, Lobby, GameRound, Guess, ChatMessage } from './lobby';

export interface ServerToClientEvents {
  lobby_joined: (lobby: Lobby) => void;
  player_joined: (data: { player: Player }) => void;
  player_left: (data: { playerId: string; username: string }) => void;
  player_ready_changed: (data: { playerId: string; isReady: boolean }) => void;
  lobby_updated: (data: { lobby: Lobby }) => void;
  lobby_finished: (data: { lobbyId: string; reason: string }) => void;
  game_starting: (data: { countdown: number }) => void;
  game_started: () => void;
  round_started: (data: {
    roundNumber: number;
    image: { url: string; description: string };
    timer: number;
    hintsEnabled: boolean;
  }) => void;
  hint_available: (data: { hint: any }) => void;
  guess_submitted: (data: { success: boolean }) => void;
  round_ended: (data: {
    correctYear: number;
    guesses: Array<{
      player: string;
      year: number;
      points: number;
      speedBonus: number;
      accuracy: number;
    }>;
    leaderboard: Array<{
      username: string;
      score: number;
      streak: number;
      isEliminated: boolean;
    }>;
    nextRoundCountdown: number | null;
  }) => void;
  game_ended: (data: {
    finalLeaderboard: Array<{
      position: number;
      username: string;
      score: number;
      streak: number;
    }>;
  }) => void;
  game_restarted: (data: {
    lobby: Lobby;
    players: Player[];
    chatMessages: ChatMessage[];
  }) => void;
  new_message: (message: ChatMessage) => void;
  new_reaction: (data: {
    playerId: string;
    emoji: string;
    targetType: string;
    targetId: string;
    roundId?: string;
  }) => void;
  host_transferred: (data: { newHostUserId: string; newHostPlayerId: string }) => void;
  host_changed: (data: { newHostId: string; newHostUsername: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  join_lobby: (data: {
    lobbyId: string;
    userId?: string;
    sessionId?: string;
    username: string;
    avatar?: string;
  }) => void;
  leave_lobby: () => void;
  player_ready: (data: { isReady: boolean }) => void;
  start_game: () => void;
  update_lobby_settings: (data: {
    gameMode: 'CLASSIC' | 'ELIMINATION' | 'MARATHON';
    roundTimer: number;
    rounds: number;
    hintsEnabled: boolean;
    maxPlayers: number;
  }) => void;
  restart_game: () => void;
  submit_guess: (data: { year: number }) => void;
  send_message: (data: { message: string; type?: 'CHAT' | 'SYSTEM' }) => void;
  send_reaction: (data: {
    emoji: string;
    targetType: string;
    targetId: string;
    roundId?: string;
  }) => void;
  kick_player: (data: { playerId: string }) => void;
  transfer_host: (data: { playerId: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  lobbyId?: string;
  playerId?: string;
  userId?: string;
}