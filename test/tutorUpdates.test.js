const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-updates-test-secret-123456789';
const { tutorInput } = require('../src/services/tutors/tutorUpdateService');

const valid = { title: 'Class update', message: 'Tomorrow class starts at ten.', category: 'Schedule', priority: 'Normal', status: 'Published', publishDate: '2026-09-15', audienceValue: 'batch-owned' };
test('tutor updates are forced to an assigned batch audience', () => {
  const data = tutorInput({ ...valid, audienceType: 'All' }, new Set(['batch-owned']));
  assert.equal(data.audienceType, 'BATCH'); assert.equal(data.batchId, 'batch-owned'); assert.equal(data.gradeId, null);
  assert.throws(() => tutorInput({ ...valid, audienceValue: 'batch-other' }, new Set(['batch-owned'])), /assigned active batches/);
});
test('tutors cannot publish fee updates', () => {
  assert.throws(() => tutorInput({ ...valid, category: 'Fee' }, new Set(['batch-owned'])), /cannot publish fee/);
});
test('Tutor Updates Swagger documents CRUD ownership', () => {
  const spec = require('../src/config/swagger');
  assert.ok(spec.paths['/api/v1/tutor/updates'].get); assert.ok(spec.paths['/api/v1/tutor/updates'].post);
  assert.ok(spec.paths['/api/v1/tutor/updates/{id}'].put); assert.ok(spec.paths['/api/v1/tutor/updates/{id}/archive'].patch);
});
