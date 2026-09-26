-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LearningMode" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable
ALTER TABLE "boards" RENAME CONSTRAINT "Board_pkey" TO "boards_pkey";

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "stream" TEXT,
    "learningMode" "LearningMode" NOT NULL DEFAULT 'OFFLINE',
    "capacity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_subjects" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "batches_academicSessionId_idx" ON "batches"("academicSessionId");

-- CreateIndex
CREATE INDEX "batches_gradeId_idx" ON "batches"("gradeId");

-- CreateIndex
CREATE INDEX "batches_boardId_idx" ON "batches"("boardId");

-- CreateIndex
CREATE INDEX "batches_learningMode_idx" ON "batches"("learningMode");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "batches_academicSessionId_name_key" ON "batches"("academicSessionId", "name");

-- CreateIndex
CREATE INDEX "batch_subjects_batchId_idx" ON "batch_subjects"("batchId");

-- CreateIndex
CREATE INDEX "batch_subjects_subjectId_idx" ON "batch_subjects"("subjectId");

-- CreateIndex
CREATE INDEX "batch_subjects_tutorId_idx" ON "batch_subjects"("tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "batch_subjects_batchId_subjectId_key" ON "batch_subjects"("batchId", "subjectId");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_subjects" ADD CONSTRAINT "batch_subjects_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_subjects" ADD CONSTRAINT "batch_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_subjects" ADD CONSTRAINT "batch_subjects_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Board_code_key" RENAME TO "boards_code_key";
