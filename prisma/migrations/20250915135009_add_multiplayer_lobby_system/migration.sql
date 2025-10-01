-- CreateEnum
CREATE TYPE "public"."LobbyStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "public"."RoundStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."Lobby" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "rounds" INTEGER NOT NULL DEFAULT 3,
    "status" "public"."LobbyStatus" NOT NULL DEFAULT 'WAITING',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "hostUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LobbyPlayer" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "username" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LobbyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MultiplayerGameRound" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "imageId" TEXT NOT NULL,
    "status" "public"."RoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultiplayerGameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MultiplayerGuess" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MultiplayerGuess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPlayer_lobbyId_userId_key" ON "public"."LobbyPlayer"("lobbyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPlayer_lobbyId_sessionId_key" ON "public"."LobbyPlayer"("lobbyId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerGameRound_lobbyId_roundNumber_key" ON "public"."MultiplayerGameRound"("lobbyId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerGuess_roundId_playerId_key" ON "public"."MultiplayerGuess"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "public"."Lobby" ADD CONSTRAINT "Lobby_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "public"."Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MultiplayerGameRound" ADD CONSTRAINT "MultiplayerGameRound_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "public"."Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MultiplayerGameRound" ADD CONSTRAINT "MultiplayerGameRound_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."DailyImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MultiplayerGuess" ADD CONSTRAINT "MultiplayerGuess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."MultiplayerGameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MultiplayerGuess" ADD CONSTRAINT "MultiplayerGuess_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."LobbyPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
