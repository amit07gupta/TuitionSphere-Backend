const test = require('node:test');
const assert = require('node:assert/strict');
const prismaPath = require.resolve('../src/config/prisma');
let writes, approvedLeave, enrolled;
const schedule = { id: 's1', batchId: 'b1', academicSessionId: 'a1', status: 'SCHEDULED', scheduleType: 'SINGLE', startDate: new Date('2020-01-01'), endDate: new Date('2020-01-01'), repeatDays: [], startTime: '10:00' };
const tx = {
  classSchedule: { findUnique: async () => schedule },
  admission: { findFirst: async () => enrolled ? { id: 'admission' } : null },
  leaveRequest: { findFirst: async () => approvedLeave },
  attendance: { upsert: async (value) => writes.push(value) },
};
const mock = { $transaction: async (fn) => { const before = writes.length; try { return await fn(tx); } catch (e) { writes.length = before; throw e; } } };
for (const model of ['batch', 'admission', 'classSchedule', 'attendance', 'leaveRequest']) mock[model] = { findMany: async () => [] };
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: mock };
const service = require('../src/services/admins/adminAttendanceService');
test.beforeEach(() => { writes = []; approvedLeave = null; enrolled = true; });
const row = { studentId: 'student', classId: 's1', status: 'Present' };
test('saves with stable student/class/date identity and actor', async () => {
  await service.save({ date: '2020-01-01', records: [row] }, 'admin');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].update.markedById, 'admin');
  assert.equal(writes[0].update.status, 'PRESENT');
  assert.equal(writes[0].where.studentId_classScheduleId_date.studentId, 'student');
});
test('approved leave cannot be overwritten as present', async () => {
  approvedLeave = { id: 'leave' };
  await service.save({ date: '2020-01-01', records: [row] }, 'admin');
  assert.equal(writes[0].update.status, 'LEAVE');
  assert.equal(writes[0].update.leaveRequestId, 'leave');
});
test('rejects unenrolled students and unapproved leave', async () => {
  enrolled = false;
  await assert.rejects(service.save({ date: '2020-01-01', records: [row] }, 'admin'), /not enrolled/);
  enrolled = true;
  await assert.rejects(service.save({ date: '2020-01-01', records: [{ ...row, status: 'Leave' }] }, 'admin'), /approved leave/);
  assert.equal(writes.length, 0);
});
test('duplicate records reject the entire batch', async () => {
  await assert.rejects(service.save({ date: '2020-01-01', records: [row, row] }, 'admin'), /Duplicate/);
  assert.equal(writes.length, 0);
});
test('rejects dates without a scheduled occurrence', async () => {
  await assert.rejects(service.save({ date: '2020-01-02', records: [row] }, 'admin'), /scheduled class/);
});
test('rejects invalid review decisions and short rejection reason', async () => {
  await assert.rejects(service.review('leave', { status: 'Cancelled' }, 'admin'), /Invalid review/);
  await assert.rejects(service.review('leave', { status: 'Rejected', rejectionReason: 'no' }, 'admin'), /at least 5/);
});
