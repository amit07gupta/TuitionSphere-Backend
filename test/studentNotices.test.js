const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-notices-test-secret-123456789';
const service = require('../src/services/students/studentNoticeService');

test('student notices are limited to active dates and authenticated student audience', async () => {
  const db = {
    student: { findUnique: async ({ where }) => { assert.deepEqual(where, { userId: 'user-1' }); return { id: 'student-1' }; } },
    admission: { findFirst: async ({ where }) => { assert.deepEqual(where, { studentId: 'student-1', status: 'ENROLLED' }); return { gradeId: 'grade-1', batchId: 'batch-1' }; } },
    notice: { findMany: async ({ where, select }) => {
      assert.equal(where.status, 'PUBLISHED');
      assert.equal(where.publishDate.lte.toISOString(), '2026-09-19T00:00:00.000Z');
      assert.deepEqual(where.AND[1].OR, [
        { audienceType: 'ALL' },
        { audienceType: 'EVERYONE' },
        { audienceType: 'GRADE', gradeId: 'grade-1' },
        { audienceType: 'BATCH', batchId: 'batch-1' },
      ]);
      assert.equal(select.message, true);
      return [{ id: 'notice-1', title: 'Exam', message: 'Exam starts Monday', category: 'EXAM', priority: 'URGENT', publishDate: new Date('2026-09-18T00:00:00Z'), expiryDate: null }];
    } },
  };
  const result = await service.list('user-1', db, new Date('2026-09-19T12:00:00Z'));
  assert.equal(result.notices[0].category, 'Exam');
  assert.equal(result.notices[0].priority, 'Urgent');
  assert.equal(result.notices[0].publishDate, '2026-09-18');
});

test('student without enrollment receives only institute-wide notices', async () => {
  const db = {
    student: { findUnique: async () => ({ id: 'student-1' }) },
    admission: { findFirst: async () => null },
    notice: { findMany: async ({ where }) => { assert.deepEqual(where.AND[1].OR, [{ audienceType: 'ALL' }, { audienceType: 'EVERYONE' }]); return []; } },
  };
  assert.deepEqual((await service.list('user-1', db)).notices, []);
});

test('student notice endpoint is documented', () => {
  assert.ok(require('../src/config/swagger').paths['/api/v1/student/notices'].get);
});
