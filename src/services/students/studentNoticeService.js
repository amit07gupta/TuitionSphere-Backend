const prisma = require('../../config/prisma');

function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
const label = (value) => value[0] + value.slice(1).toLowerCase();
const dateKey = (value) => value?.toISOString().slice(0, 10) || '';

async function list(userId, db = prisma, now = new Date()) {
  const student = await db.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) fail('Student profile not found', 404);
  const admission = await db.admission.findFirst({
    where: { studentId: student.id, status: 'ENROLLED' },
    orderBy: { joiningDate: 'desc' },
    select: { gradeId: true, batchId: true },
  });
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const today = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  const audiences = [{ audienceType: 'ALL' }, { audienceType: 'EVERYONE' }];
  if (admission) audiences.push({ audienceType: 'GRADE', gradeId: admission.gradeId }, { audienceType: 'BATCH', batchId: admission.batchId });
  const rows = await db.notice.findMany({
    where: { status: 'PUBLISHED', publishDate: { lte: today }, AND: [
      { OR: [{ expiryDate: null }, { expiryDate: { gte: today } }] },
      { OR: audiences },
    ] },
    select: { id: true, title: true, message: true, category: true, priority: true, publishDate: true, expiryDate: true, reads: { where: { userId }, select: { id: true } } },
    orderBy: [{ priority: 'desc' }, { publishDate: 'desc' }, { createdAt: 'desc' }],
  });
  return { enrollment: admission, notices: rows.map(({ reads = [], ...row }) => ({ ...row, isRead: reads.length > 0, category: label(row.category), priority: label(row.priority), publishDate: dateKey(row.publishDate), expiryDate: dateKey(row.expiryDate) })) };
}

async function markAllRead(userId, db = prisma, now = new Date()) {
  const result = await list(userId, db, now);
  if (result.notices.length) {
    await db.noticeRead.createMany({
      data: result.notices.map((notice) => ({ userId, noticeId: notice.id })),
      skipDuplicates: true,
    });
  }
  return list(userId, db, now);
}

module.exports = { list, markAllRead };
