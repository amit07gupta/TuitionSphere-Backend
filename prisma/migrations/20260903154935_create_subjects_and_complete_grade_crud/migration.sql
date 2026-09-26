-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "streams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_grades" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_boardId_idx" ON "subjects"("boardId");

-- CreateIndex
CREATE INDEX "subjects_status_idx" ON "subjects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_boardId_code_key" ON "subjects"("boardId", "code");

-- CreateIndex
CREATE INDEX "subject_grades_subjectId_idx" ON "subject_grades"("subjectId");

-- CreateIndex
CREATE INDEX "subject_grades_gradeId_idx" ON "subject_grades"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_grades_subjectId_gradeId_key" ON "subject_grades"("subjectId", "gradeId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_grades" ADD CONSTRAINT "subject_grades_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_grades" ADD CONSTRAINT "subject_grades_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
