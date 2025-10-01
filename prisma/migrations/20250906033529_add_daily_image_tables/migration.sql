-- CreateTable
CREATE TABLE "public"."DailyImage" (
    "id" TEXT NOT NULL,
    "cloudinaryUrl" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyGameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "imageId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyGameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyImage_date_key" ON "public"."DailyImage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyGameProgress_userId_imageId_key" ON "public"."DailyGameProgress"("userId", "imageId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyGameProgress_userId_date_key" ON "public"."DailyGameProgress"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."DailyGameProgress" ADD CONSTRAINT "DailyGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyGameProgress" ADD CONSTRAINT "DailyGameProgress_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."DailyImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
