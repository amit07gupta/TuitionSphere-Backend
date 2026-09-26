-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP_REQUIRED', 'READY_FOR_ADMISSION', 'CLOSED');

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "gradeId" TEXT NOT NULL,
    "inquiryType" TEXT NOT NULL,
    "message" TEXT,
    "contactMethod" TEXT NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "learningMode" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "followUpNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiries_gradeId_idx" ON "inquiries"("gradeId");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "inquiries_phone_idx" ON "inquiries"("phone");

-- CreateIndex
CREATE INDEX "inquiries_email_idx" ON "inquiries"("email");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
