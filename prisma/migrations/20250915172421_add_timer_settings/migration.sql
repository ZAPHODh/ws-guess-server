-- AlterTable
ALTER TABLE "public"."Lobby" ADD COLUMN     "roundTimer" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "public"."MultiplayerGameRound" ADD COLUMN     "timerEndsAt" TIMESTAMP(3);
