const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-attendance-test-secret-123456789';

const service = require('../src/services/students/studentAttendanceService');

test('student attendance queries are scoped to the authenticated student', async () => {
  const calls = {};
  const db = {
    student: { findUnique: async (query) => { calls.student = query; return { id: 'student-1' }; } },
    admission: { findFirst: async (query) => { calls.admission = query; return null; } },
    attendance: { findMany: async (query) => { calls.attendance = query; return []; } },
    leaveRequest: { findMany: async (query) => { calls.requests = query; return []; } },
    classSchedule: { findMany: async () => { throw new Error('No schedule query without enrollment'); } },
  };
  const result = await service.context('user-1', db);
  assert.deepEqual(calls.student.where, { userId: 'user-1' });
  assert.deepEqual(calls.admission.where, { studentId: 'student-1', status: 'ENROLLED' });
  assert.deepEqual(calls.attendance.where, { studentId: 'student-1' });
  assert.deepEqual(calls.requests.where, { studentId: 'student-1' });
  assert.deepEqual(result, { enrollment: null, schedules: [], records: [], requests: [] });
});

test('leave input rejects invalid dates, type and reason', () => {
  assert.throws(() => service.validateLeave({ fromDate: '2026-02-30', toDate: '2026-03-01', type: 'Medical', reason: 'Long enough reason' }), /valid date/);
  assert.throws(() => service.validateLeave({ fromDate: '2026-09-18', toDate: '2026-09-17', type: 'Medical', reason: 'Long enough reason' }), /within one year/);
  assert.throws(() => service.validateLeave({ fromDate: '2026-09-17', toDate: '2026-09-17', type: 'Vacation', reason: 'Long enough reason' }), /valid leave type/);
  assert.throws(() => service.validateLeave({ fromDate: '2026-09-17', toDate: '2026-09-17', type: 'Medical', reason: 'short' }), /10 to 500/);
});

test('student cannot cancel another student’s leave request', async () => {
  const db = {
    student: { findUnique: async () => ({ id: 'student-1' }) },
    leaveRequest: { findFirst: async (query) => {
      assert.deepEqual(query.where, { id: 'leave-2', studentId: 'student-1' });
      return null;
    } },
  };
  await assert.rejects(() => service.cancelLeave('user-1', 'leave-2', db), /not found/);
});

test('cancellation does not overwrite an admin review that wins the race', async () => {
  const db = {
    student: { findUnique: async () => ({ id: 'student-1' }) },
    leaveRequest: {
      findFirst: async () => ({ id: 'leave-1', status: 'PENDING' }),
      updateMany: async (query) => {
        assert.deepEqual(query.where, { id: 'leave-1', studentId: 'student-1', status: 'PENDING' });
        return { count: 0 };
      },
    },
  };
  await assert.rejects(() => service.cancelLeave('user-1', 'leave-1', db), /Only pending/);
});

test('student leave submission and cancellation appear in the same attendance context', async () => {
  let request = null;
  const schedule = {
    id: 'class-1', batchId: 'batch-1', academicSessionId: 'session-1',
    startDate: new Date('2026-09-17'), endDate: new Date('2026-09-17'),
    scheduleType: 'SINGLE', repeatDays: ['THURSDAY'], status: 'SCHEDULED',
    subject: { name: 'Math' }, topic: 'Algebra', startTime: '10:00', endTime: '11:00',
  };
  const db = {
    student: { findUnique: async () => ({ id: 'student-1' }) },
    admission: { findFirst: async () => ({
      batchId: 'batch-1', academicSessionId: 'session-1', joiningDate: new Date('2026-09-01'),
      batch: { name: 'Evening' }, grade: { numericValue: 10 }, board: { code: 'CBSE' },
    }) },
    classSchedule: { findMany: async () => [schedule] },
    attendance: { findMany: async () => [] },
    leaveRequest: {
      findFirst: async (query) => query.where.id ? request : null,
      findMany: async () => request ? [request] : [],
      create: async ({ data }) => { request = { id: 'leave-1', status: 'PENDING', createdAt: new Date('2026-09-16'), rejectionReason: null, ...data }; },
      updateMany: async ({ data }) => { request = { ...request, ...data }; return { count: 1 }; },
    },
  };
  const submitted = await service.createLeave('user-1', {
    fromDate: '2026-09-17', toDate: '2026-09-17', type: 'Medical', reason: 'Doctor appointment',
  }, db);
  assert.equal(submitted.requests[0].status, 'Pending');
  assert.equal(submitted.requests[0].affectedSessions.length, 1);
  const cancelled = await service.cancelLeave('user-1', 'leave-1', db);
  assert.equal(cancelled.requests[0].status, 'Cancelled');
});
