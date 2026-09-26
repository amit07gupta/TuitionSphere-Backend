const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../src/config/prisma');
const request = {
  id: 'leave-1', studentId: 'student-1', batchId: 'batch-1',
  fromDate: new Date('2026-09-17'), toDate: new Date('2026-09-17'),
  status: 'REJECTED', rejectionReason: 'Previously rejected',
};
const schedule = {
  id: 'class-1', batchId: 'batch-1', academicSessionId: 'session-1',
  status: 'SCHEDULED', scheduleType: 'SINGLE',
  startDate: new Date('2026-09-17'), endDate: new Date('2026-09-17'),
  repeatDays: [], subject: { name: 'Math' }, startTime: '10:00',
};
let current, conflict, writes;
const tx = {
  leaveRequest: {
    findUnique: async () => current,
    findFirst: async () => conflict,
    updateMany: async ({ where, data }) => {
      if (where.status !== current.status) return { count: 0 };
      current = { ...current, ...data };
      return { count: 1 };
    },
  },
  admission: { findFirst: async () => ({ academicSessionId: 'session-1', joiningDate: new Date('2026-09-01') }) },
  classSchedule: { findMany: async () => [schedule] },
  attendance: { upsert: async (input) => writes.push(input) },
};
const mock = { $transaction: async (fn) => fn(tx) };
for (const model of ['batch', 'admission', 'classSchedule', 'attendance', 'leaveRequest']) {
  mock[model] = { findMany: async () => [] };
}
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: mock };
const service = require('../src/services/admins/adminAttendanceService');

test.beforeEach(() => {
  current = { ...request };
  conflict = null;
  writes = [];
});

test('admin can approve a rejected request and apply leave attendance', async () => {
  await service.review('leave-1', { status: 'Approved' }, 'admin-1');
  assert.equal(current.status, 'APPROVED');
  assert.equal(current.rejectionReason, null);
  assert.equal(current.reviewedById, 'admin-1');
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].update, { status: 'LEAVE', leaveRequestId: 'leave-1', markedById: 'admin-1' });
});

test('pending requests can still be rejected or approved', async () => {
  current = { ...request, status: 'PENDING', rejectionReason: null };
  await service.review('leave-1', { status: 'Rejected', rejectionReason: 'Missing details' }, 'admin-1');
  assert.equal(current.status, 'REJECTED');
  assert.equal(current.rejectionReason, 'Missing details');
  assert.equal(writes.length, 0);

  current = { ...request, status: 'PENDING', rejectionReason: null };
  await service.review('leave-1', { status: 'Approved' }, 'admin-1');
  assert.equal(current.status, 'APPROVED');
  assert.equal(writes.length, 1);
});

test('correction cannot overlap another approved leave', async () => {
  conflict = { id: 'leave-2' };
  await assert.rejects(service.review('leave-1', { status: 'Approved' }, 'admin-1'), /Another approved leave/);
  assert.equal(current.status, 'REJECTED');
  assert.equal(writes.length, 0);
});

test('approved and cancelled requests cannot be reviewed again', async () => {
  for (const status of ['APPROVED', 'CANCELLED']) {
    current.status = status;
    await assert.rejects(service.review('leave-1', { status: 'Approved' }, 'admin-1'), /cannot be reviewed again/);
  }
  assert.equal(writes.length, 0);
});
