-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('ACADEMIC', 'SCHEDULE', 'EXAM', 'FEE', 'GENERAL');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "NoticeAudience" AS ENUM ('ALL', 'GRADE', 'BATCH');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "NoticeCategory" NOT NULL DEFAULT 'ACADEMIC',
    "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
    "audienceType" "NoticeAudience" NOT NULL DEFAULT 'ALL',
    "gradeId" TEXT,
    "batchId" TEXT,
    "publishDate" DATE NOT NULL,
    "expiryDate" DATE,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notices_status_publishDate_expiryDate_idx" ON "notices"("status", "publishDate", "expiryDate");

-- CreateIndex
CREATE INDEX "notices_gradeId_idx" ON "notices"("gradeId");

-- CreateIndex
CREATE INDEX "notices_batchId_idx" ON "notices"("batchId");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notices" ADD CONSTRAINT "notices_valid_audience" CHECK (
  ("audienceType" = 'ALL' AND "gradeId" IS NULL AND "batchId" IS NULL) OR
  ("audienceType" = 'GRADE' AND "gradeId" IS NOT NULL AND "batchId" IS NULL) OR
  ("audienceType" = 'BATCH' AND "batchId" IS NOT NULL AND "gradeId" IS NULL)
);
ALTER TABLE "notices" ADD CONSTRAINT "notices_valid_dates" CHECK ("expiryDate" IS NULL OR "expiryDate" >= "publishDate");
