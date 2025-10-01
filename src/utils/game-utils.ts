export const calculatePoints = (guess: number, correctYear: number, roundStartTime: number, hintsGiven: number = 0) => {
  const yearDiff = Math.abs(guess - correctYear);
  let basePoints = Math.max(0, 100 - yearDiff);

  const responseTime = Date.now() - roundStartTime;
  const maxResponseTime = 60000;
  const speedBonus = Math.max(0, 20 - Math.floor((responseTime / maxResponseTime) * 20));

  const hintPenalty = hintsGiven * 5;

  return {
    points: Math.max(0, basePoints + speedBonus - hintPenalty),
    speedBonus,
    accuracy: yearDiff
  };
};

export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};