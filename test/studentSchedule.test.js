const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-schedule-test-secret-123456789';

const { getStudentSchedule } = require('../src/services/students/studentScheduleService');

test('student schedule is scoped to the signed-in student and enrolled batch', async () => {
  const calls = {};
  const db = {
    student: { findUnique: async (query) => {
      calls.student = query;
      return { id: 'student-1', studentCode: 'TS-1' };
    } },
    admission: { findFirst: async (query) => {
      calls.admission = query;
      return {
        batchId: 'batch-1', academicSessionId: 'session-1',
        batch: { name: 'Evening', learningMode: 'ONLINE' },
        grade: { numericValue: 10 }, board: { code: 'CBSE' },
      };
    } },
    classSchedule: { findMany: async (query) => {
      calls.schedule = query;
      return [{
        id: 'class-1', batchId: 'batch-1', scheduleType: 'SINGLE',
        startDate: new Date('2026-09-17'), endDate: new Date('2026-09-17'),
        repeatDays: ['THURSDAY'], startTime: '10:00', endTime: '11:00',
        subject: { name: 'Math' }, tutor: { user: { name: 'Tutor' } },
        learningMode: 'ONLINE', meetingUrl: 'https://example.com/class',
        status: 'CANCELLED', topic: null, location: null,
      }];
    } },
  };

  const result = await getStudentSchedule('user-1', db);
  assert.deepEqual(calls.student.where, { userId: 'user-1' });
  assert.deepEqual(calls.admission.where, { studentId: 'student-1', status: 'ENROLLED' });
  assert.deepEqual(calls.schedule.where, { batchId: 'batch-1', academicSessionId: 'session-1' });
  assert.equal(result.enrollment.batchName, 'Evening');
  assert.equal(result.schedules[0].status, 'CANCELLED');
  assert.equal(result.schedules[0].subject, 'Math');
});

test('student with no enrolled batch has an empty schedule', async () => {
  const result = await getStudentSchedule('user-2', {
    student: { findUnique: async () => ({ id: 'student-2', studentCode: 'TS-2' }) },
    admission: { findFirst: async () => null },
    classSchedule: { findMany: async () => { throw new Error('Schedules should not be queried'); } },
  });
  assert.deepEqual(result, { studentCode: 'TS-2', enrollment: null, schedules: [] });
});
