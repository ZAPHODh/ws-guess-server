/*
  Warnings:

  - The `tip` column on the `DailyImage` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."DailyImage" DROP COLUMN "tip",
ADD COLUMN     "tip" JSONB;
