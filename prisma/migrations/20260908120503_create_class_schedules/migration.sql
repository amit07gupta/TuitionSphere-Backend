-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('SINGLE', 'RECURRING');

-- CreateEnum
CREATE TYPE "ClassScheduleStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL DEFAULT 'SINGLE',
    "topic" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "repeatDays" "Weekday"[] DEFAULT ARRAY[]::"Weekday"[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "learningMode" "LearningMode" NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "status" "ClassScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_schedules_academicSessionId_idx" ON "class_schedules"("academicSessionId");

-- CreateIndex
CREATE INDEX "class_schedules_batchId_idx" ON "class_schedules"("batchId");

-- CreateIndex
CREATE INDEX "class_schedules_subjectId_idx" ON "class_schedules"("subjectId");

-- CreateIndex
CREATE INDEX "class_schedules_tutorId_idx" ON "class_schedules"("tutorId");

-- CreateIndex
CREATE INDEX "class_schedules_startDate_endDate_idx" ON "class_schedules"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "class_schedules_status_idx" ON "class_schedules"("status");

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
