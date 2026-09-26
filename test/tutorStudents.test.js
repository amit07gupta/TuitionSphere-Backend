const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-students-test-secret-123456789';
const { buildTutorStudentFilters } = require('../src/services/tutors/tutorStudentFilterService');

test('tutor student filters stay inside assigned batches and active session', () => {
  const where = buildTutorStudentFilters(['batch-owned'], 'session-active', { tutorId: 'other', batchId: 'batch-owned', status: 'active', search: ' Ravi ' });
  assert.equal(where.academicSessionId, 'session-active'); assert.equal(where.batchId, 'batch-owned'); assert.equal(where.status, 'ENROLLED');
  assert.equal(where.student.user.status, 'ACTIVE'); assert.equal(where.OR[0].student.studentCode.contains, 'Ravi'); assert.equal(where.tutorId, undefined);
});
test('tutor student filters reject unauthorized batches and invalid statuses', () => {
  assert.throws(() => buildTutorStudentFilters(['owned'], 'session', { batchId: 'other' }), /not assigned/);
  assert.throws(() => buildTutorStudentFilters(['owned'], 'session', { status: 'deleted' }), /Invalid student account status/);
});
test('tutor student controller uses authenticated user identity', async () => {
  const service = require('../src/services/tutors/tutorStudentService'); const controller = require('../src/controllers/tutorStudentController'); const original = service.getTutorStudents;
  try { let received; service.getTutorStudents = async (...args) => { received = args; return { students: [], assignedBatches: [], academicSession: null }; };
    await controller.list({ user: { id: 'user-owned' }, query: { tutorId: 'other' } }, { json() {} }, (error) => { throw error; }); assert.deepEqual(received, ['user-owned', { tutorId: 'other' }]);
  } finally { service.getTutorStudents = original; }
});
test('Swagger documents tutor-owned students endpoint', () => {
  const operation = require('../src/config/swagger').paths['/api/v1/tutor/students'].get; assert.equal(operation.tags[0], 'Tutor Students'); assert.match(operation.description, /derived from the bearer token/);
  for (const status of [200, 400, 401, 403, 404]) assert.ok(operation.responses[status]);
});
