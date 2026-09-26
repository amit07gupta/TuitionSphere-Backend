const statuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
const frequencies = ["MONTHLY", "QUARTERLY", "FULL_SESSION"];

function allowedEnum(value, values) {
  const normalized = String(value || "").trim().toUpperCase().replaceAll(" ", "_");
  return values.includes(normalized) ? normalized : undefined;
}

function buildFeePlanFilters(query = {}) {
  const academicSessionId = String(query.academicSessionId || "").trim();
  const gradeId = String(query.gradeId || "").trim();
  const status = allowedEnum(query.status, statuses);
  const billingFrequency = allowedEnum(query.billingFrequency, frequencies);

  return {
    ...(academicSessionId && { academicSessionId }),
    ...(gradeId && { gradeId }),
    ...(status && { status }),
    ...(billingFrequency && { billingFrequency }),
  };
}

module.exports = { buildFeePlanFilters };
