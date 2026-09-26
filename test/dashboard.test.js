const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-dashboard-unit-test-secret-123456789';
const { buildDashboardFilters } = require('../src/services/admins/adminDashboardFilterService');
const { summarizeAttendance } = require('../src/services/admins/adminDashboardService');
test('monthly window follows IST, handles year rollover and leap February', () => {
  const f = buildDashboardFilters({ month: '2024-02', academicSessionId: 'session' });
  assert.equal(f.days, 29); assert.equal(f.start.toISOString(), '2024-01-31T18:30:00.000Z'); assert.equal(f.end.toISOString(), '2024-02-29T18:30:00.000Z');
  assert.deepEqual(f.session, { academicSessionId: 'session' });
  assert.equal(buildDashboardFilters({ month: '2026-12' }).end.toISOString(), '2026-12-31T18:30:00.000Z');
  assert.equal(buildDashboardFilters({}, new Date('2026-09-30T20:00:00Z')).month, '2026-10');
});
test('invalid month and repeated/object session queries fail validation', () => {
  for (const month of ['2026-13', '2026-2', 'invalid', ['2026-09']]) assert.throws(() => buildDashboardFilters({ month }), { statusCode: 400 });
  assert.throws(() => buildDashboardFilters({ academicSessionId: {} }), { statusCode: 400 });
});
test('attendance queue counts partially marked completed classes, excludes future and empty classes', () => {
  const schedules = [{ id: 'one', batchId: 'b', academicSessionId: 's', endTime: '10:00' }, { id: 'future', batchId: 'b', academicSessionId: 's', endTime: '18:00' }, { id: 'empty', batchId: 'empty', academicSessionId: 's', endTime: '10:00' }];
  const students = [{ studentId: 'a', batchId: 'b', academicSessionId: 's' }, { studentId: 'b', batchId: 'b', academicSessionId: 's' }];
  const now = new Date('2026-09-10T12:00:00+05:30');
  assert.equal(summarizeAttendance(schedules, students, [{ classScheduleId: 'one', studentId: 'a' }], '2026-09-10', now), 1);
  assert.equal(summarizeAttendance(schedules, students, students.map((s) => ({ classScheduleId: 'one', studentId: s.studentId })), '2026-09-10', now), 0);
});
