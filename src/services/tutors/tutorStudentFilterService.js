const USER_STATUSES = new Set(["ACTIVE", "INACTIVE", "BLOCKED"]);

function httpError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function buildTutorStudentFilters(batchIds, academicSessionId, query = {}) {
  const status = query.status ? String(query.status).toUpperCase() : "";
  if (status && !USER_STATUSES.has(status)) throw httpError("Invalid student account status");

  const allowedBatchIds = new Set(batchIds);
  if (query.batchId && !allowedBatchIds.has(String(query.batchId))) {
    throw httpError("Selected batch is not assigned to this tutor");
  }

  const where = {
    status: "ENROLLED",
    academicSessionId,
    batchId: query.batchId ? String(query.batchId) : { in: batchIds },
  };
  if (query.gradeId) where.gradeId = String(query.gradeId);
  if (query.boardId) where.boardId = String(query.boardId);
  if (status) where.student = { user: { status } };

  const search = String(query.search || "").trim();
  if (search) {
    where.OR = [
      { student: { studentCode: { contains: search, mode: "insensitive" } } },
      { student: { parentName: { contains: search, mode: "insensitive" } } },
      { student: { parentPhone: { contains: search, mode: "insensitive" } } },
      { student: { user: { name: { contains: search, mode: "insensitive" } } } },
      { student: { user: { email: { contains: search, mode: "insensitive" } } } },
      { batch: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

module.exports = { buildTutorStudentFilters };
