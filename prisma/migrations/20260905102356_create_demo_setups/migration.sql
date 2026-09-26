-- CreateEnum
CREATE TYPE "DemoSetupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "demo_setups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "stream" TEXT,
    "mode" "LearningMode" NOT NULL DEFAULT 'OFFLINE',
    "demoStartDate" TIMESTAMP(3) NOT NULL,
    "demoEndDate" TIMESTAMP(3) NOT NULL,
    "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DemoSetupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_setup_boards" (
    "id" TEXT NOT NULL,
    "demoSetupId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_setup_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_slots" (
    "id" TEXT NOT NULL,
    "demoSetupId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_setups_academicSessionId_idx" ON "demo_setups"("academicSessionId");

-- CreateIndex
CREATE INDEX "demo_setups_tutorId_idx" ON "demo_setups"("tutorId");

-- CreateIndex
CREATE INDEX "demo_setups_gradeId_idx" ON "demo_setups"("gradeId");

-- CreateIndex
CREATE INDEX "demo_setups_mode_idx" ON "demo_setups"("mode");

-- CreateIndex
CREATE INDEX "demo_setups_status_idx" ON "demo_setups"("status");

-- CreateIndex
CREATE INDEX "demo_setups_demoStartDate_demoEndDate_idx" ON "demo_setups"("demoStartDate", "demoEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "demo_setups_academicSessionId_name_key" ON "demo_setups"("academicSessionId", "name");

-- CreateIndex
CREATE INDEX "demo_setup_boards_demoSetupId_idx" ON "demo_setup_boards"("demoSetupId");

-- CreateIndex
CREATE INDEX "demo_setup_boards_boardId_idx" ON "demo_setup_boards"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "demo_setup_boards_demoSetupId_boardId_key" ON "demo_setup_boards"("demoSetupId", "boardId");

-- CreateIndex
CREATE INDEX "demo_slots_demoSetupId_idx" ON "demo_slots"("demoSetupId");

-- CreateIndex
CREATE UNIQUE INDEX "demo_slots_demoSetupId_startTime_endTime_key" ON "demo_slots"("demoSetupId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "demo_setups" ADD CONSTRAINT "demo_setups_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_setups" ADD CONSTRAINT "demo_setups_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_setups" ADD CONSTRAINT "demo_setups_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_setup_boards" ADD CONSTRAINT "demo_setup_boards_demoSetupId_fkey" FOREIGN KEY ("demoSetupId") REFERENCES "demo_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_setup_boards" ADD CONSTRAINT "demo_setup_boards_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_slots" ADD CONSTRAINT "demo_slots_demoSetupId_fkey" FOREIGN KEY ("demoSetupId") REFERENCES "demo_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
