function buildClassScheduleFilters(query = {}) {
  const where = {};
  if (query.batchId) where.batchId = String(query.batchId);
  if (query.subjectId) where.subjectId = String(query.subjectId);
  if (query.tutorId) where.tutorId = String(query.tutorId);
  if (query.academicSessionId) where.academicSessionId = String(query.academicSessionId);
  if (query.status) where.status = String(query.status).toUpperCase();
  if (query.learningMode) where.learningMode = String(query.learningMode).toUpperCase();
  if (query.day) where.repeatDays = { has: String(query.day).toUpperCase() };
  const search = String(query.search || "").trim();
  if (search) {
    where.OR = [
      { topic: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { batch: { name: { contains: search, mode: "insensitive" } } },
      { subject: { name: { contains: search, mode: "insensitive" } } },
      { tutor: { user: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }
  return where;
}

module.exports = { buildClassScheduleFilters };
