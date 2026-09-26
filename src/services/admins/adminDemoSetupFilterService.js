const statuses = ["ACTIVE", "INACTIVE"];
const modes = ["ONLINE", "OFFLINE"];

function enumValue(value, allowed) {
  const normalized = String(value || "").trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function buildDemoSetupFilters(query = {}) {
  const academicSessionId = String(query.academicSessionId || "").trim();
  const gradeId = String(query.gradeId || "").trim();
  const boardId = String(query.boardId || "").trim();
  const tutorId = String(query.tutorId || "").trim();
  const status = enumValue(query.status, statuses);
  const mode = enumValue(query.mode, modes);

  return {
    ...(academicSessionId && { academicSessionId }),
    ...(gradeId && { gradeId }),
    ...(boardId && { boards: { some: { boardId } } }),
    ...(tutorId && { tutorId }),
    ...(status && { status }),
    ...(mode && { mode }),
  };
}

module.exports = { buildDemoSetupFilters };
