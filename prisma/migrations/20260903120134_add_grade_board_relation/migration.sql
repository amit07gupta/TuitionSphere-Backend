-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "gradeName" TEXT NOT NULL,
    "numericValue" INTEGER NOT NULL,
    "learningStage" TEXT NOT NULL,
    "status" "GradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_boards" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_boards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grades_numericValue_key" ON "grades"("numericValue");

-- CreateIndex
CREATE INDEX "grade_boards_gradeId_idx" ON "grade_boards"("gradeId");

-- CreateIndex
CREATE INDEX "grade_boards_boardId_idx" ON "grade_boards"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_boards_gradeId_boardId_key" ON "grade_boards"("gradeId", "boardId");

-- AddForeignKey
ALTER TABLE "grade_boards" ADD CONSTRAINT "grade_boards_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_boards" ADD CONSTRAINT "grade_boards_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
