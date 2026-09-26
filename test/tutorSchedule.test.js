const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-schedule-test-secret-123456789';

const { buildTutorScheduleFilters } = require('../src/services/tutors/tutorScheduleFilterService');

test('tutor schedule filters always scope records to the authenticated tutor', () => {
  const where = buildTutorScheduleFilters('tutor-owned', {
    tutorId: 'tutor-other', status: 'scheduled', learningMode: 'online',
    from: '2026-09-01', to: '2026-09-30', search: ' algebra ',
  });
  assert.equal(where.tutorId, 'tutor-owned');
  assert.equal(where.status, 'SCHEDULED');
  assert.equal(where.learningMode, 'ONLINE');
  assert.equal(where.endDate.gte.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(where.startDate.lte.toISOString(), '2026-09-30T00:00:00.000Z');
  assert.equal(where.OR[0].topic.contains, 'algebra');
});

test('tutor schedule filters reject invalid values', () => {
  assert.throws(() => buildTutorScheduleFilters('t', { status: 'complete' }), /Invalid class schedule status/);
  assert.throws(() => buildTutorScheduleFilters('t', { learningMode: 'hybrid' }), /Invalid learning mode/);
  assert.throws(() => buildTutorScheduleFilters('t', { from: '2026-02-30' }), /valid date/);
  assert.throws(() => buildTutorScheduleFilters('t', { from: '2026-10-01', to: '2026-09-01' }), /cannot be after/);
});

test('tutor schedule controller passes authenticated user id to the service', async () => {
  const service = require('../src/services/tutors/tutorScheduleService');
  const controller = require('../src/controllers/tutorScheduleController');
  const original = service.getTutorScheduleContext;
  try {
    let received;
    service.getTutorScheduleContext = async (...args) => { received = args; return { schedules: [{ id: 'schedule-1' }], academicSession: null }; };
    let response;
    await controller.list({ user: { id: 'user-1' }, query: { status: 'scheduled' } }, { json: (value) => { response = value; } }, (error) => { throw error; });
    assert.deepEqual(received, ['user-1', { status: 'scheduled' }]);
    assert.deepEqual(response, { success: true, data: { schedules: [{ id: 'schedule-1' }], academicSession: null } });
  } finally {
    service.getTutorScheduleContext = original;
  }
});

test('Swagger documents the tutor-owned schedule endpoint', () => {
  const spec = require('../src/config/swagger');
  const operation = spec.paths['/api/v1/tutor/schedule'].get;
  assert.equal(operation.tags[0], 'Tutor Schedule');
  for (const status of [200, 400, 401, 403, 404]) assert.ok(operation.responses[status]);
  assert.match(operation.description, /derived from the bearer token/);
});
