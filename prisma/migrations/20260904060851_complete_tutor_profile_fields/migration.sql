/*
  Warnings:

  - Added the required column `availability` to the `tutors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `designation` to the `tutors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tutors" ADD COLUMN     "availability" TEXT NOT NULL,
ADD COLUMN     "designation" TEXT NOT NULL,
ADD COLUMN     "modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "streams" TEXT[] DEFAULT ARRAY[]::TEXT[];
