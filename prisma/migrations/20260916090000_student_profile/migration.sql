ALTER TABLE "students" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "students" ADD COLUMN "communicationPreference" TEXT NOT NULL DEFAULT 'Email';

CREATE TABLE "student_profile_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_profile_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_profile_requests_studentId_createdAt_idx" ON "student_profile_requests"("studentId", "createdAt");
ALTER TABLE "student_profile_requests" ADD CONSTRAINT "student_profile_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
