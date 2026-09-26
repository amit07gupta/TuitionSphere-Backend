-- CreateEnum
CREATE TYPE "TutorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "tutors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "qualification" TEXT,
    "experience" INTEGER,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "TutorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_boards" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_grades" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_subjects" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutors_userId_key" ON "tutors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_employeeCode_key" ON "tutors"("employeeCode");

-- CreateIndex
CREATE INDEX "tutors_status_idx" ON "tutors"("status");

-- CreateIndex
CREATE INDEX "tutor_boards_tutorId_idx" ON "tutor_boards"("tutorId");

-- CreateIndex
CREATE INDEX "tutor_boards_boardId_idx" ON "tutor_boards"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_boards_tutorId_boardId_key" ON "tutor_boards"("tutorId", "boardId");

-- CreateIndex
CREATE INDEX "tutor_grades_tutorId_idx" ON "tutor_grades"("tutorId");

-- CreateIndex
CREATE INDEX "tutor_grades_gradeId_idx" ON "tutor_grades"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_grades_tutorId_gradeId_key" ON "tutor_grades"("tutorId", "gradeId");

-- CreateIndex
CREATE INDEX "tutor_subjects_tutorId_idx" ON "tutor_subjects"("tutorId");

-- CreateIndex
CREATE INDEX "tutor_subjects_subjectId_idx" ON "tutor_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_subjects_tutorId_subjectId_key" ON "tutor_subjects"("tutorId", "subjectId");

-- AddForeignKey
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_boards" ADD CONSTRAINT "tutor_boards_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_boards" ADD CONSTRAINT "tutor_boards_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_grades" ADD CONSTRAINT "tutor_grades_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_grades" ADD CONSTRAINT "tutor_grades_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
