function enumValue(value, allowed, label) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!allowed.includes(normalized)) throw Object.assign(new Error(`Invalid ${label}`), { statusCode: 400 });
  return normalized;
}
const categories = ['ACADEMIC', 'SCHEDULE', 'EXAM', 'FEE', 'GENERAL'];
const priorities = ['NORMAL', 'IMPORTANT', 'URGENT'];
const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const audiences = ['ALL', 'GRADE', 'BATCH', 'TUTORS', 'TUTOR', 'EVERYONE'];
function buildNoticeFilters(query = {}) {
  const where = {};
  for (const [field, values] of [['status', statuses], ['category', categories], ['priority', priorities], ['audienceType', audiences]]) {
    if (query[field]) where[field] = enumValue(query[field], values, field);
  }
  for (const field of ['gradeId', 'batchId', 'tutorId']) if (query[field]) where[field] = String(query[field]);
  const search = String(query.search || '').trim();
  if (search) {
    where.OR = ['title', 'message'].map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
    const categoryMatches = categories.filter((category) => category.includes(search.toUpperCase()));
    if (categoryMatches.length) where.OR.push({ category: { in: categoryMatches } });
  }
  return where;
}
module.exports = { buildNoticeFilters, enumValue, categories, priorities, statuses, audiences };
