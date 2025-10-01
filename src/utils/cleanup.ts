import { prisma } from './database';

export const cleanupAbandonedLobbies = async () => {
  try {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);


    const abandonedLobbies = await prisma.lobby.findMany({
      where: {
        updatedAt: { lt: cutoffTime },
        status: { not: 'FINISHED' }
      },
      include: {
        players: true
      }
    });

    for (const lobby of abandonedLobbies) {
      if (lobby.players.length === 0) {
        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { status: 'FINISHED' }
        });
        console.log(`Cleaned up abandoned lobby: ${lobby.id}`);
      }
    }
    const veryOldCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedCount = await prisma.lobby.deleteMany({
      where: {
        status: 'FINISHED',
        updatedAt: { lt: veryOldCutoff }
      }
    });

    if (deletedCount.count > 0) {
      console.log(`Deleted ${deletedCount.count} old finished lobbies`);
    }
  } catch (error) {
    console.error('Error during lobby cleanup:', error);
  }
};