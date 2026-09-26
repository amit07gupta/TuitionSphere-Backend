-- CreateEnum
CREATE TYPE "StudentProfileStatus" AS ENUM ('INCOMPLETE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ENROLLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "DemoRequestStatus" ADD VALUE 'ENROLLED';

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "relationship" TEXT,
    "profileStatus" "StudentProfileStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "demoRequestId" TEXT,
    "academicSessionId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ENROLLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE INDEX "students_parentPhone_idx" ON "students"("parentPhone");

-- CreateIndex
CREATE INDEX "students_profileStatus_idx" ON "students"("profileStatus");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_demoRequestId_key" ON "admissions"("demoRequestId");

-- CreateIndex
CREATE INDEX "admissions_academicSessionId_idx" ON "admissions"("academicSessionId");

-- CreateIndex
CREATE INDEX "admissions_gradeId_idx" ON "admissions"("gradeId");

-- CreateIndex
CREATE INDEX "admissions_boardId_idx" ON "admissions"("boardId");

-- CreateIndex
CREATE INDEX "admissions_batchId_idx" ON "admissions"("batchId");

-- CreateIndex
CREATE INDEX "admissions_feePlanId_idx" ON "admissions"("feePlanId");

-- CreateIndex
CREATE INDEX "admissions_status_idx" ON "admissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_studentId_academicSessionId_key" ON "admissions"("studentId", "academicSessionId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_demoRequestId_fkey" FOREIGN KEY ("demoRequestId") REFERENCES "demo_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "fee_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
