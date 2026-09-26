// Uses disposable fixtures inside a transaction that is always rolled back.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
let scoped = prisma;
const adapter = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn) => fn(scoped) : scoped[key] });
require.cache[require.resolve('../src/config/prisma')].exports = adapter;
const service = require('../src/services/admins/adminAssignmentService');
const rollback = new Error('ROLLBACK_ASSIGNMENT_SMOKE');
(async () => {
  const initial = await service.list();
  console.log(`Read check passed: ${initial.length} assignments.`);
  try {
    await prisma.$transaction(async (tx) => {
      scoped = tx;
      const mapping = await tx.batchSubject.findFirst();
      const admin = await tx.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
      const admission = mapping && await tx.admission.findFirst({ where: { batchId: mapping.batchId, status: 'ENROLLED' } });
      assert.ok(mapping && admin && admission, 'A batch/subject/tutor mapping, admin and enrolled student are needed for this check');
      const assignment = await tx.assignment.create({ data: { title: 'Disposable assignment smoke fixture', batchId: mapping.batchId, subjectId: mapping.subjectId, tutorId: mapping.tutorId, dueDate: new Date('2026-09-30'), totalMarks: 20, status: 'DRAFT', attachmentName: 'reference.txt', attachmentData: Buffer.from('Reference') } });
      await tx.assignmentSubmission.create({ data: { assignmentId: assignment.id, studentId: admission.studentId, status: 'REVIEWED', marks: 0, feedback: 'Needs revision', fileName: 'answer.txt', fileData: Buffer.from('Answer') } });
      let row = (await service.list()).find((item) => item.id === assignment.id);
      assert.ok((await service.list({ batchId: mapping.batchId, subjectId: mapping.subjectId, tutorId: mapping.tutorId, status: 'Draft', search: 'Disposable assignment smoke fixture' })).some((item) => item.id === assignment.id));
      assert.ok(!(await service.list({ status: 'Published' })).some((item) => item.id === assignment.id));
      assert.equal(row.submittedCount, 1); assert.equal(row.reviewedCount, 1); assert.ok(row.tutorName); assert.ok(row.batchName); assert.ok(row.subject);
      assert.equal(row.attachmentData, undefined);
      const detail = await service.detail(assignment.id);
      assert.equal(detail.submissions[0].marks, 0); assert.equal(detail.submissions[0].status, 'Reviewed'); assert.ok(detail.submissions[0].studentName);
      assert.equal(detail.attachmentData, 'data:application/octet-stream;base64,UmVmZXJlbmNl');
      row = await service.updateArchive(assignment.id, { action: 'archive', expectedStatus: 'Draft' }, admin.id);
      assert.equal(row.status, 'Archived');
      row = await service.updateArchive(assignment.id, { action: 'restore', expectedStatus: 'Archived' }, admin.id);
      assert.equal(row.status, 'Draft');
      assert.equal((await tx.assignment.findUnique({ where: { id: assignment.id } })).adminUpdatedById, admin.id);
      await assert.rejects(service.detail('missing-assignment'), /not found/);
      console.log('Database checks passed: mapping, counts, detail, zero marks, attachment, archive/restore, actor and missing record.');
      throw rollback;
    }, { timeout: 20000 });
  } catch (e) { if (e !== rollback) throw e; }
  scoped = prisma;
  assert.equal((await service.list()).length, initial.length);
  console.log('Disposable fixtures rolled back; assignment count unchanged.');
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
