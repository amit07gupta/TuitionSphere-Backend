const roles = ['ADMIN', 'SUPER_ADMIN'];
const statuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
function enumValue(value, allowed, label) {
  const normalized = String(value || '').trim().toUpperCase().replaceAll(' ', '_');
  if (!allowed.includes(normalized)) throw Object.assign(new Error(`Invalid ${label}`), { statusCode: 400 });
  return normalized;
}
function buildAdminUserFilters(query = {}) {
  const where = { role: { in: roles } };
  if (query.role) where.role = enumValue(query.role, roles, 'admin role');
  if (query.status) where.status = enumValue(query.status, statuses, 'account status');
  const search = String(query.search || '').trim();
  if (search) where.OR = ['name', 'email', 'phone'].map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
  return where;
}
module.exports = { buildAdminUserFilters, enumValue, roles, statuses };
