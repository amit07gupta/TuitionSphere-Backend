const statuses = new Set(["SCHEDULED", "CANCELLED"]);
const learningModes = new Set(["ONLINE", "OFFLINE"]);

function httpError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) throw httpError(`${label} must use YYYY-MM-DD format`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw httpError(`${label} must be a valid date`);
  return date;
}

function buildTutorScheduleFilters(tutorId, query = {}) {
  if (!tutorId) throw httpError("Tutor profile is required");
  const where = { tutorId };
  if (query.batchId) where.batchId = String(query.batchId).trim();
  if (query.subjectId) where.subjectId = String(query.subjectId).trim();

  if (query.status) {
    const status = String(query.status).toUpperCase();
    if (!statuses.has(status)) throw httpError("Invalid class schedule status");
    where.status = status;
  }
  if (query.learningMode) {
    const learningMode = String(query.learningMode).toUpperCase();
    if (!learningModes.has(learningMode)) throw httpError("Invalid learning mode");
    where.learningMode = learningMode;
  }

  const from = query.from ? parseDate(String(query.from), "From date") : null;
  const to = query.to ? parseDate(String(query.to), "To date") : null;
  if (from && to && from > to) throw httpError("From date cannot be after to date");
  if (from) where.endDate = { gte: from };
  if (to) where.startDate = { lte: to };

  const search = String(query.search || "").trim();
  if (search) where.OR = [
    { topic: { contains: search, mode: "insensitive" } },
    { location: { contains: search, mode: "insensitive" } },
    { batch: { name: { contains: search, mode: "insensitive" } } },
    { subject: { name: { contains: search, mode: "insensitive" } } },
  ];
  return where;
}

module.exports = { buildTutorScheduleFilters };
