const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAssignmentFilters } = require('../src/services/admins/adminAssignmentFilterService');
const { buildAttendanceFilters } = require('../src/services/admins/adminAttendanceFilterService');
test('assignment filter normalizes status and uses case-insensitive search', () => {
  assert.deepEqual(buildAssignmentFilters({ status: 'Draft', search: '  Algebra ', batchId: 'b', subjectId: 's', tutorId: 't' }), { status: 'DRAFT', title: { contains: 'Algebra', mode: 'insensitive' }, batchId: 'b', subjectId: 's', tutorId: 't' });
  assert.throws(() => buildAssignmentFilters({ status: 'broken' }), /Invalid/);
});
test('attendance filter keeps attendance and leave statuses independent', () => {
  const result = buildAttendanceFilters({ batchId: 'b', studentId: 's', status: 'Present', leaveStatus: 'Approved', month: '2026-12', date: '2026-12-01' });
  assert.equal(result.records.status, 'PRESENT'); assert.equal(result.leaves.status, 'APPROVED');
  assert.equal(result.leaves.fromDate.lt.toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(result.records.classSchedule.batchId, 'b');
  assert.throws(() => buildAttendanceFilters({ month: '2026-13' }), /Invalid/);
  assert.throws(() => buildAttendanceFilters({ date: '2026-02-30' }), /valid date/);
  assert.throws(() => buildAttendanceFilters({ status: 'Approved' }), /Invalid/);
});
test('controllers forward query/body/actor and preserve the error handler contract', async () => {
  for (const [entity, cases] of [['Attendance', [['list', 'context', ['query']], ['save', 'save', ['body', 'user']], ['reviewLeave', 'review', ['id', 'body', 'user']]]], ['Assignment', [['list', 'list', ['query']], ['getById', 'detail', ['id']], ['updateArchive', 'updateArchive', ['id', 'body', 'user']]]]]) {
    const service = require(`../src/services/admins/admin${entity}Service`);
    const controller = require(`../src/controllers/admin${entity}Controller`);
    const req = { query: { status: 'Draft' }, body: { action: 'archive' }, params: { id: 'record' }, user: { id: 'admin' } };
    for (const [handler, method, args] of cases) {
      const original = service[method];
      try {
        let response;
        service[method] = async (...received) => { assert.deepEqual(received, args.map((arg) => arg === 'id' ? 'record' : arg === 'user' ? 'admin' : req[arg])); return ['result']; };
        await controller[handler](req, { json: (value) => { response = value; } }, (e) => { throw e; });
        assert.equal(response.success, true); assert.deepEqual(response.data, ['result']);
        const expected = new Error('service failure'); let forwarded;
        service[method] = async () => { throw expected; };
        await controller[handler](req, {}, (e) => { forwarded = e; });
        assert.equal(forwarded, expected);
      } finally { service[method] = original; }
    }
  }
});
test('Swagger covers every module method, bearer auth and resolves schema references', () => {
  const spec = require('../src/config/swagger');
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
  for (const [path, methods] of Object.entries({ '/api/v1/attendance': ['get', 'put'], '/api/v1/attendance/leave-requests/{id}/review': ['patch'], '/api/v1/assignments': ['get'], '/api/v1/assignments/{id}': ['get'], '/api/v1/assignments/{id}/archive': ['patch'] })) {
    for (const method of methods) {
      const operation = spec.paths[path][method]; assert.ok(operation.responses[200]); assert.ok(operation.responses[401]); assert.ok(operation.responses[403]);
      if (method !== 'get') assert.equal(operation.requestBody.required, true);
    }
  }
  const check = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.$ref?.startsWith('#/')) assert.ok(value.$ref.slice(2).split('/').reduce((node, key) => node?.[key], spec), value.$ref);
    Object.values(value).forEach(check);
  };
  check(spec);
});
