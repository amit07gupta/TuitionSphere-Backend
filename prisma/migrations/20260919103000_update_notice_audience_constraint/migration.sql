ALTER TABLE "notices" DROP CONSTRAINT IF EXISTS "notices_valid_audience";

ALTER TABLE "notices"
ADD CONSTRAINT "notices_valid_audience"
CHECK (
  ("audienceType" IN ('ALL', 'TUTORS', 'EVERYONE') AND "gradeId" IS NULL AND "batchId" IS NULL AND "tutorId" IS NULL)
  OR ("audienceType" = 'GRADE' AND "gradeId" IS NOT NULL AND "batchId" IS NULL AND "tutorId" IS NULL)
  OR ("audienceType" = 'BATCH' AND "batchId" IS NOT NULL AND "gradeId" IS NULL AND "tutorId" IS NULL)
  OR ("audienceType" = 'TUTOR' AND "tutorId" IS NOT NULL AND "gradeId" IS NULL AND "batchId" IS NULL)
);
