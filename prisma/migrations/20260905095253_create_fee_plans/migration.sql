-- CreateEnum
CREATE TYPE "FeePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'FULL_SESSION');

-- CreateTable
CREATE TABLE "fee_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "admissionFee" DECIMAL(12,2) NOT NULL,
    "tuitionFee" DECIMAL(12,2) NOT NULL,
    "billingFrequency" "BillingFrequency" NOT NULL,
    "installments" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "lateFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "status" "FeePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_plans_academicSessionId_idx" ON "fee_plans"("academicSessionId");

-- CreateIndex
CREATE INDEX "fee_plans_gradeId_idx" ON "fee_plans"("gradeId");

-- CreateIndex
CREATE INDEX "fee_plans_status_idx" ON "fee_plans"("status");

-- CreateIndex
CREATE INDEX "fee_plans_effectiveFrom_effectiveTo_idx" ON "fee_plans"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "fee_plans_academicSessionId_gradeId_key" ON "fee_plans"("academicSessionId", "gradeId");

-- AddForeignKey
ALTER TABLE "fee_plans" ADD CONSTRAINT "fee_plans_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plans" ADD CONSTRAINT "fee_plans_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
