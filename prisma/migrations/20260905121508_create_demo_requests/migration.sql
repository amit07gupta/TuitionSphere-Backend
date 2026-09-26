-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'ADMISSION_STARTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "demoDate" TIMESTAMP(3) NOT NULL,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW',
    "demoSetupId" TEXT NOT NULL,
    "demoSlotId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "stream" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_requests_demoSetupId_demoDate_idx" ON "demo_requests"("demoSetupId", "demoDate");

-- CreateIndex
CREATE INDEX "demo_requests_demoSlotId_demoDate_idx" ON "demo_requests"("demoSlotId", "demoDate");

-- CreateIndex
CREATE INDEX "demo_requests_status_idx" ON "demo_requests"("status");

-- CreateIndex
CREATE INDEX "demo_requests_email_idx" ON "demo_requests"("email");

-- CreateIndex
CREATE INDEX "demo_requests_phone_idx" ON "demo_requests"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "demo_requests_email_demoDate_demoSlotId_key" ON "demo_requests"("email", "demoDate", "demoSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "demo_requests_phone_demoDate_demoSlotId_key" ON "demo_requests"("phone", "demoDate", "demoSlotId");

-- AddForeignKey
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_demoSetupId_fkey" FOREIGN KEY ("demoSetupId") REFERENCES "demo_setups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_demoSlotId_fkey" FOREIGN KEY ("demoSlotId") REFERENCES "demo_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
