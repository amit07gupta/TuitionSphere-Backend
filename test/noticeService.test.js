const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/admins/adminNoticeService');
const { buildNoticeFilters } = require('../src/services/admins/adminNoticeFilterService');
const input = { title: '  New notice ', message: 'A valid notice message', category: 'Academic', priority: 'Normal', audienceType: 'All', audienceValue: 'all', publishDate: '2026-09-09', expiryDate: '', status: 'Draft' };
test('normalizes all-student notice and strips stale targets', () => {
  const data = service.validateInput({ ...input, gradeId: 'old', batchId: 'old' });
  assert.equal(data.title, 'New notice'); assert.equal(data.gradeId, null); assert.equal(data.batchId, null); assert.equal(data.status, 'DRAFT'); assert.equal(data.expiryDate, null);
});
test('audience values are real IDs and clear the other reference', () => {
  const grade = service.validateInput({ ...input, audienceType: 'Grade', audienceValue: 'grade-id' });
  assert.equal(grade.gradeId, 'grade-id'); assert.equal(grade.batchId, null);
  const batch = service.validateInput({ ...input, audienceType: 'Batch', audienceValue: 'batch-id' });
  assert.equal(batch.batchId, 'batch-id'); assert.equal(batch.gradeId, null);
  const tutor = service.validateInput({ ...input, audienceType: 'Tutor', audienceValue: 'tutor-id' });
  assert.equal(tutor.tutorId, 'tutor-id'); assert.equal(tutor.gradeId, null); assert.equal(tutor.batchId, null);
  const everyone = service.validateInput({ ...input, audienceType: 'Everyone', audienceValue: '' });
  assert.equal(everyone.audienceType, 'EVERYONE'); assert.equal(everyone.tutorId, null);
  assert.throws(() => service.validateInput({ ...input, audienceType: 'Grade', audienceValue: '' }), /valid audience/);
});
test('rejects impossible dates and reversed publication window', () => {
  assert.throws(() => service.validateInput({ ...input, publishDate: '2026-02-30' }), /valid date/);
  assert.throws(() => service.validateInput({ ...input, expiryDate: '2026-09-08' }), /earlier/);
  assert.ok(service.validateInput({ ...input, expiryDate: '2026-09-09' }));
});
test('rejects invalid content and enum values', () => {
  for (const change of [{ title: ' ' }, { message: 'short' }, { status: 'Deleted' }, { priority: 'High' }, { category: 'Other' }, { audienceType: 'Public' }]) assert.throws(() => service.validateInput({ ...input, ...change }));
  assert.throws(() => service.validateInput(null));
});
test('filter searches text/category and normalizes status', () => {
  const where = buildNoticeFilters({ status: 'Published', audienceType: 'Grade', gradeId: 'g', search: ' exam ' });
  assert.equal(where.status, 'PUBLISHED'); assert.equal(where.gradeId, 'g');
  assert.deepEqual(where.OR.at(-1), { category: { in: ['EXAM'] } });
  assert.throws(() => buildNoticeFilters({ priority: 'broken' }));
});
test('notice controller returns 201 and forwards failures', async () => {
  const controller = require('../src/controllers/adminNoticeController'); const original = service.createNotice;
  try {
    let status; let result;
    service.createNotice = async (body, actor) => { assert.equal(body, input); assert.equal(actor, 'admin'); return { id: 'n' }; };
    const res = { status(value) { status = value; return this; }, json(value) { result = value; } };
    await controller.create({ body: input, user: { id: 'admin' } }, res, (e) => { throw e; });
    assert.equal(status, 201); assert.equal(result.data.id, 'n');
    const failure = new Error('validation'); let forwarded;
    service.createNotice = async () => { throw failure; };
    await controller.create({ body: input, user: { id: 'admin' } }, res, (e) => { forwarded = e; });
    assert.equal(forwarded, failure);
  } finally { service.createNotice = original; }
});
test('Swagger documents all protected notice routes', () => {
  const spec = require('../src/config/swagger');
  for (const [path, methods] of Object.entries({ '/api/v1/notices': ['get', 'post'], '/api/v1/notices/{id}': ['get', 'put'], '/api/v1/notices/{id}/archive': ['patch'] })) {
    for (const method of methods) { const operation = spec.paths[path][method]; assert.ok(operation.responses[401]); assert.ok(operation.responses[403]); }
  }
  assert.equal(spec.components.schemas.NoticeInput.properties.message.minLength, 10);
});
