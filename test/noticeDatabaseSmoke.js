// All fixture writes are rolled back, including archive and audience changes.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
let scoped = prisma;
require.cache[require.resolve('../src/config/prisma')].exports = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn) => fn(scoped) : scoped[key] });
const service = require('../src/services/admins/adminNoticeService');
const rollback = new Error('ROLLBACK_NOTICE_SMOKE');
(async () => {
  const before = await prisma.notice.count();
  try {
    await prisma.$transaction(async (tx) => {
      scoped = tx;
      const admin = await tx.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
      const grade = await tx.grade.findFirst({ where: { status: 'ACTIVE' } });
      const batch = await tx.batch.findFirst({ where: { status: 'ACTIVE' } });
      assert.ok(admin && grade && batch, 'Admin, active grade and batch required');
      const input = { title: 'Disposable notices smoke fixture', message: 'Test notice for database verification.', category: 'Academic', priority: 'Normal', audienceType: 'All', audienceValue: 'all', publishDate: '2026-09-09', expiryDate: '', status: 'Draft' };
      let row = await service.createNotice(input, admin.id);
      const id = row.id;
      assert.equal(row.audienceLabel, 'All students'); assert.equal(row.createdById, admin.id);
      row = await service.updateNotice(id, { ...input, audienceType: 'Grade', audienceValue: grade.id, status: 'Published' }, admin.id);
      assert.equal(row.gradeId, grade.id); assert.equal(row.batchId, null); assert.equal(row.audienceLabel, grade.gradeName);
      assert.ok((await service.listNotices({ gradeId: grade.id, status: 'Published', search: 'Disposable notices smoke fixture' })).some((n) => n.id === id));
      assert.ok(!(await service.listNotices({ status: 'Draft' })).some((n) => n.id === id));
      row = await service.updateNotice(id, { ...input, audienceType: 'Batch', audienceValue: batch.id }, admin.id);
      assert.equal(row.batchId, batch.id); assert.equal(row.gradeId, null);
      await assert.rejects(service.createNotice({ ...input, audienceType: 'Grade', audienceValue: 'missing' }, admin.id), /does not exist/);
      row = await service.updateNotice(id, input, admin.id);
      assert.equal(row.gradeId, null); assert.equal(row.batchId, null);
      row = await service.archiveNotice(id, admin.id); assert.equal(row.status, 'Archived');
      assert.equal((await service.getNoticeById(id)).status, 'Archived');
      assert.equal((await service.archiveNotice(id, admin.id)).status, 'Archived');
      await assert.rejects(service.getNoticeById('missing'), /not found/);
      console.log('Database checks passed: create, read, update, Grade/Batch/All audience, filters, archive, actor and invalid target.');
      throw rollback;
    }, { timeout: 20000 });
  } catch (e) { if (e !== rollback) throw e; }
  scoped = prisma;
  assert.equal(await prisma.notice.count(), before);
  console.log('Fixtures rolled back; notice count unchanged.');
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
