const prisma = require('../../config/prisma');
const { buildNoticeFilters, enumValue, categories, priorities, statuses, audiences } = require('./adminNoticeFilterService');
const include = { grade: { select: { id: true, gradeName: true } }, batch: { select: { id: true, name: true } }, tutor: { select: { id: true, employeeCode: true, user: { select: { name: true } } } } };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function dateValue(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} must be a valid date`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(`${label} must be a valid date`);
  return date;
}
function validateInput(input = {}) {
  if (!input || typeof input !== 'object') fail('Notice details are required');
  const title = String(input.title || '').trim(); const message = String(input.message || '').trim();
  if (!title || title.length > 200) fail('Title must contain 1 to 200 characters');
  if (message.length < 10 || message.length > 10000) fail('Message must contain 10 to 10000 characters');
  const category = enumValue(input.category, categories, 'category');
  const priority = enumValue(input.priority, priorities, 'priority');
  const audienceType = enumValue(input.audienceType, audiences, 'audience');
  const status = enumValue(input.status, statuses, 'status');
  const publishDate = dateValue(input.publishDate, 'Publish date');
  const expiryDate = input.expiryDate ? dateValue(input.expiryDate, 'Expiry date') : null;
  if (expiryDate && expiryDate < publishDate) fail('Expiry date cannot be earlier than publish date');
  const audienceValue = String(input.audienceValue || '').trim();
  if (['GRADE', 'BATCH', 'TUTOR'].includes(audienceType) && !audienceValue) fail('Select a valid audience');
  return { title, message, category, priority, audienceType, status, publishDate, expiryDate, gradeId: audienceType === 'GRADE' ? audienceValue : null, batchId: audienceType === 'BATCH' ? audienceValue : null, tutorId: audienceType === 'TUTOR' ? audienceValue : null };
}
async function validateAudience(tx, data, existing) {
  for (const [field, model] of [['gradeId', 'grade'], ['batchId', 'batch'], ['tutorId', 'tutor']]) {
    if (!data[field]) continue;
    const target = await tx[model].findUnique({ where: { id: data[field] } });
    if (!target) fail(`Selected ${model} does not exist`);
    // Existing inactive targets can be retained while editing or archiving a notice.
    if (target.status !== 'ACTIVE' && existing?.[field] !== data[field]) fail(`Select an active ${model}`);
  }
}
const label = (value) => value[0] + value.slice(1).toLowerCase();
function normalize(row) {
  const generalLabels = { ALL: 'All students', TUTORS: 'All tutors', EVERYONE: 'Everyone' };
  return { ...row, category: label(row.category), priority: label(row.priority), status: label(row.status), audienceType: label(row.audienceType), audienceValue: row.gradeId || row.batchId || row.tutorId || 'all', audienceLabel: generalLabels[row.audienceType] || row.grade?.gradeName || row.batch?.name || row.tutor?.user?.name || 'Audience unavailable', publishDate: row.publishDate.toISOString().slice(0, 10), expiryDate: row.expiryDate?.toISOString().slice(0, 10) || '' };
}
async function listNotices(query = {}) {
  const rows = await prisma.notice.findMany({ where: buildNoticeFilters(query), include, orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }] });
  return rows.map(normalize);
}
async function getNoticeById(id) {
  const row = await prisma.notice.findUnique({ where: { id }, include });
  if (!row) fail('Notice not found', 404);
  return normalize(row);
}
async function createNotice(input, userId) {
  const data = validateInput(input);
  return prisma.$transaction(async (tx) => {
    await validateAudience(tx, data);
    return normalize(await tx.notice.create({ data: { ...data, createdById: userId, updatedById: userId }, include }));
  });
}
async function updateNotice(id, input, userId) {
  const data = validateInput(input);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.notice.findUnique({ where: { id } });
    if (!existing) fail('Notice not found', 404);
    await validateAudience(tx, data, existing);
    return normalize(await tx.notice.update({ where: { id }, data: { ...data, updatedById: userId }, include }));
  });
}
async function archiveNotice(id, userId) {
  return prisma.$transaction(async (tx) => {
    if (!await tx.notice.findUnique({ where: { id } })) fail('Notice not found', 404);
    return normalize(await tx.notice.update({ where: { id }, data: { status: 'ARCHIVED', updatedById: userId }, include }));
  });
}
module.exports = { listNotices, getNoticeById, createNotice, updateNotice, archiveNotice, validateInput, normalize };
