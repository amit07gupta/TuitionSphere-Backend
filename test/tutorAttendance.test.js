const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-attendance-test-secret-123456789';

test('tutor attendance controller scopes list and save to authenticated user', async () => {
  const service = require('../src/services/tutors/tutorAttendanceService');
  const controller = require('../src/controllers/tutorAttendanceController');
  const originalContext = service.context;
  const originalSave = service.save;
  try {
    const calls = [];
    service.context = async (...args) => { calls.push(['list', ...args]); return { schedules: [] }; };
    service.save = async (...args) => { calls.push(['save', ...args]); return { records: [] }; };
    const responses = [];
    const res = { json: (value) => responses.push(value) };
    const next = (error) => { throw error; };
    await controller.list({ user: { id: 'user-1' }, query: { date: '2026-09-15' } }, res, next);
    await controller.save({ user: { id: 'user-1' }, body: { date: '2026-09-15', records: [] } }, res, next);
    assert.deepEqual(calls, [
      ['list', 'user-1', { date: '2026-09-15' }],
      ['save', 'user-1', { date: '2026-09-15', records: [] }],
    ]);
    assert.equal(responses[0].success, true);
    assert.equal(responses[1].success, true);
  } finally {
    service.context = originalContext;
    service.save = originalSave;
  }
});

test('Swagger documents tutor attendance read and save operations', () => {
  const spec = require('../src/config/swagger');
  const path = spec.paths['/api/v1/tutor/attendance'];
  assert.ok(path.get);
  assert.ok(path.put);
  assert.equal(path.get.tags[0], 'Tutor Attendance');
});
