const prisma = require('../../config/prisma');
const { getTutorForUser } = require('./tutorScheduleService');
const { validateInput, normalize } = require('../admins/adminNoticeService');
const { buildNoticeFilters } = require('../admins/adminNoticeFilterService');

const include = { grade: { select: { id: true, gradeName: true } }, batch: { select: { id: true, name: true } }, tutor: { select: { id: true, employeeCode: true, user: { select: { name: true } } } } };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function indiaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
}

async function context(userId) {
  const tutor = await getTutorForUser(userId);
  const assignments = await prisma.batchSubject.findMany({
    where: { tutorId: tutor.id, batch: { status: 'ACTIVE', academicSession: { status: 'ACTIVE' } } },
    select: { batch: { select: { id: true, name: true } } },
    orderBy: { batch: { name: 'asc' } },
  });
  return { tutor, batches: [...new Map(assignments.map(({ batch }) => [batch.id, batch])).values()] };
}

function tutorInput(input, batchIds) {
  const data = validateInput({ ...input, audienceType: 'Batch', audienceValue: input.audienceValue || input.batchId });
  if (!data.batchId || !batchIds.has(data.batchId)) fail('Select one of your assigned active batches', 403);
  if (data.category === 'FEE') fail('Tutors cannot publish fee updates', 403);
  return data;
}

async function list(userId, query = {}) {
  const { tutor, batches } = await context(userId);
  const batchIds = batches.map(({ id }) => id);
  const today = indiaToday();
  const [rows, receivedRows] = await Promise.all([
    prisma.notice.findMany({
      where: { ...buildNoticeFilters(query), createdById: userId, batchId: { in: batchIds } }, include,
      orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.notice.findMany({
      where: {
        status: 'PUBLISHED', publishDate: { lte: today },
        AND: [
          { OR: [{ expiryDate: null }, { expiryDate: { gte: today } }] },
          { OR: [{ audienceType: 'TUTORS' }, { audienceType: 'EVERYONE' }, { audienceType: 'TUTOR', tutorId: tutor.id }] },
        ],
      }, include,
      orderBy: [{ priority: 'desc' }, { publishDate: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);
  return { updates: rows.map(normalize), receivedUpdates: receivedRows.map(normalize), assignedBatches: batches };
}

async function create(userId, input) {
  const { batches } = await context(userId);
  const data = tutorInput(input, new Set(batches.map(({ id }) => id)));
  return normalize(await prisma.notice.create({ data: { ...data, createdById: userId, updatedById: userId }, include }));
}

async function update(userId, id, input) {
  const { batches } = await context(userId);
  const data = tutorInput(input, new Set(batches.map(({ id: batchId }) => batchId)));
  const result = await prisma.notice.updateMany({ where: { id, createdById: userId }, data: { ...data, updatedById: userId } });
  if (!result.count) fail('Update not found or does not belong to this tutor', 404);
  return normalize(await prisma.notice.findUnique({ where: { id }, include }));
}

async function archive(userId, id) {
  const result = await prisma.notice.updateMany({ where: { id, createdById: userId }, data: { status: 'ARCHIVED', updatedById: userId } });
  if (!result.count) fail('Update not found or does not belong to this tutor', 404);
  return normalize(await prisma.notice.findUnique({ where: { id }, include }));
}

module.exports = { list, create, update, archive, tutorInput };
