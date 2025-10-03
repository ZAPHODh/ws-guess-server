import { z } from 'zod';

export const joinLobbySchema = z.object({
  lobbyId: z.string().min(1),
  userId: z.string().nullable(),
  sessionId: z.string().nullable(),
  username: z.string().min(1).max(50),
  avatar: z.string().max(10)
});

export const submitGuessSchema = z.object({
  year: z.number().int().min(1800).max(2030)
});

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['CHAT', 'QUICK_PHRASE'])
});

export const playerReadySchema = z.object({
  isReady: z.boolean()
});

export const sendReactionSchema = z.object({
  emoji: z.string().max(10),
  targetType: z.string(),
  targetId: z.string().optional(),
  roundId: z.string().optional()
});

export const kickPlayerSchema = z.object({
  playerId: z.string().min(1)
});

export const transferHostSchema = z.object({
  playerId: z.string().min(1)
});

export const updateLobbySettingsSchema = z.object({
  gameMode: z.enum(['CLASSIC', 'ELIMINATION', 'MARATHON']).optional(),
  roundTimer: z.number().int().min(15).max(300).optional(),
  rounds: z.number().int().min(1).max(20).optional(),
  hintsEnabled: z.boolean().optional(),
  maxPlayers: z.number().int().min(2).max(8).optional()
});

export function validateSocketData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  eventName: string
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues;
    console.error(`[Validation Error] ${eventName}:`, issues);
    return {
      success: false,
      error: issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
    };
  }

  return { success: true, data: result.data };
}
