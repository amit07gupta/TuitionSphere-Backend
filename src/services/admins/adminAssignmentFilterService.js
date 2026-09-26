function buildAssignmentFilters(query = {}) {
  const where = {};
  for (const field of ['batchId', 'subjectId', 'tutorId']) if (query[field]) where[field] = String(query[field]);
  if (query.status) {
    const status = String(query.status).toUpperCase();
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) throw Object.assign(new Error('Invalid assignment status'), { statusCode: 400 });
    where.status = status;
  }
  const search = String(query.search || '').trim();
  if (search) where.title = { contains: search, mode: 'insensitive' };
  return where;
}
module.exports = { buildAssignmentFilters };
