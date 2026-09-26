const batchStatuses = ["ACTIVE", "INACTIVE"];
const learningModes = ["ONLINE", "OFFLINE"];

function normalizeEnum(value, allowedValues) {
  const normalized = String(value || "").trim().toUpperCase();
  return allowedValues.includes(normalized) ? normalized : undefined;
}

function buildBatchFilters(query = {}) {
  const search = String(query.search || "").trim();
  const academicSessionId = String(query.academicSessionId || "").trim();
  const gradeId = String(query.gradeId || "").trim();
  const boardId = String(query.boardId || "").trim();
  const status = normalizeEnum(query.status, batchStatuses);
  const learningMode = normalizeEnum(query.learningMode || query.mode, learningModes);

  return {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { stream: { contains: search, mode: "insensitive" } },
        { grade: { gradeName: { contains: search, mode: "insensitive" } } },
        { board: { code: { contains: search, mode: "insensitive" } } },
        { subjects: { some: { subject: { name: { contains: search, mode: "insensitive" } } } } },
      ],
    }),
    ...(academicSessionId && { academicSessionId }),
    ...(gradeId && { gradeId }),
    ...(boardId && { boardId }),
    ...(status && { status }),
    ...(learningMode && { learningMode }),
  };
}

module.exports = { buildBatchFilters };
