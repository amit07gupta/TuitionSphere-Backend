CREATE TYPE "StudentPaymentReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "student_payment_reports" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "proofName" TEXT NOT NULL,
    "proofData" BYTEA NOT NULL,
    "note" TEXT,
    "status" "StudentPaymentReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_payment_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_payment_reports_invoiceId_status_idx" ON "student_payment_reports"("invoiceId", "status");
CREATE INDEX "student_payment_reports_studentId_createdAt_idx" ON "student_payment_reports"("studentId", "createdAt");
CREATE INDEX "student_payment_reports_reviewedById_idx" ON "student_payment_reports"("reviewedById");
CREATE UNIQUE INDEX "student_payment_reports_one_pending_per_invoice" ON "student_payment_reports"("invoiceId") WHERE "status" = 'PENDING';

ALTER TABLE "student_payment_reports" ADD CONSTRAINT "student_payment_reports_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_payment_reports" ADD CONSTRAINT "student_payment_reports_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_payment_reports" ADD CONSTRAINT "student_payment_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
