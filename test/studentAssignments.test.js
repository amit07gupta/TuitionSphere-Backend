const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-assignments-test-secret-123456789';

const service = require('../src/services/students/studentAssignmentService');
const pdf = Buffer.from('%PDF-1.7\nstudent answer');
const answer = { fileName: 'answer.pdf', fileData: `data:application/pdf;base64,${pdf.toString('base64')}` };
const enrollmentDb = {
  student: { findUnique: async ({ where }) => {
    assert.deepEqual(where, { userId: 'user-1' });
    return { id: 'student-1' };
  } },
  admission: { findFirst: async ({ where }) => {
    assert.deepEqual(where, { studentId: 'student-1', status: 'ENROLLED' });
    return { batchId: 'batch-1', batch: { name: 'Evening batch' } };
  } },
};

test('student sees published assignments only for their enrolled batch and their own submission', async () => {
  const row = {
    id: 'assignment-1', title: 'Algebra', type: 'Homework', instructions: 'Solve 1–10',
    batchId: 'batch-1', dueDate: new Date('2026-09-25T00:00:00Z'), totalMarks: 20,
    status: 'PUBLISHED', attachmentName: 'questions.pdf', attachmentData: pdf,
    subject: { name: 'Mathematics' }, tutor: { user: { name: 'Tutor One' } },
    submissions: [{ id: 'submission-1', assignmentId: 'assignment-1', status: 'SUBMITTED',
      fileName: 'answer.pdf', fileData: pdf, marks: null, feedback: null,
      submittedAt: new Date('2026-09-18T00:00:00Z'), reviewedAt: null }],
  };
  const db = {
    ...enrollmentDb,
    assignment: {
      findMany: async ({ where, select }) => {
        assert.deepEqual(where, { batchId: 'batch-1', status: 'PUBLISHED' });
        assert.equal(select.submissions.where.studentId, 'student-1');
        assert.equal(select.submissions.select.fileData, undefined);
        return [row];
      },
      findFirst: async ({ where, select }) => {
        assert.deepEqual(where, { id: 'assignment-1', batchId: 'batch-1', status: 'PUBLISHED' });
        assert.equal(select.submissions.where.studentId, 'student-1');
        return row;
      },
    },
  };
  const list = await service.list('user-1', db);
  assert.equal(list.enrollment.batchName, 'Evening batch');
  assert.equal(list.assignments[0].submission.status, 'Submitted');
  assert.equal(list.assignments[0].attachmentData, undefined);
  const detail = await service.detail('user-1', 'assignment-1', db);
  assert.match(detail.attachmentData, /^data:application\/pdf;base64,/);
  assert.match(detail.submission.fileData, /^data:application\/pdf;base64,/);
});

test('student can submit a valid answer but cannot replace a reviewed submission', async () => {
  let created;
  const db = {
    ...enrollmentDb,
    assignment: { findFirst: async ({ where }) => {
      assert.deepEqual(where, { id: 'assignment-1', batchId: 'batch-1', status: 'PUBLISHED' });
      return { id: 'assignment-1' };
    } },
    assignmentSubmission: {
      findUnique: async () => null,
      create: async ({ data }) => {
        created = data;
        return { id: 'submission-1', ...data, status: 'SUBMITTED', marks: null,
          feedback: null, submittedAt: new Date(), reviewedAt: null };
      },
    },
  };
  const result = await service.submit('user-1', 'assignment-1', answer, db);
  assert.equal(created.studentId, 'student-1');
  assert.equal(created.fileData.toString(), pdf.toString());
  assert.equal(result.status, 'Submitted');
  db.assignmentSubmission.findUnique = async ({ select }) => select.id
    ? { id: 'submission-1', status: 'SUBMITTED' }
    : { id: 'submission-1', assignmentId: 'assignment-1', status: 'SUBMITTED',
      fileName: 'answer.pdf', marks: null, feedback: null, submittedAt: new Date(), reviewedAt: null };
  db.assignmentSubmission.updateMany = async ({ where, data }) => {
    assert.deepEqual(where, { id: 'submission-1', assignmentId: 'assignment-1', studentId: 'student-1', status: 'SUBMITTED' });
    assert.equal(data.fileData.toString(), pdf.toString());
    return { count: 1 };
  };
  const replacement = await service.submit('user-1', 'assignment-1', answer, db);
  assert.equal(replacement.status, 'Submitted');
  db.assignmentSubmission.findUnique = async () => ({ id: 'submission-1', status: 'REVIEWED' });
  await assert.rejects(service.submit('user-1', 'assignment-1', answer, db),
    (error) => error.statusCode === 409 && /Reviewed/.test(error.message));
});

test('student submission rejects mismatched file content and access to another batch', async () => {
  assert.throws(() => service.parseSubmission({ fileName: 'answer.pdf', fileData: `data:application/pdf;base64,${Buffer.from('not a PDF').toString('base64')}` }), /does not match/);
  const db = {
    ...enrollmentDb,
    assignment: { findFirst: async ({ where }) => {
      assert.equal(where.batchId, 'batch-1');
      return null;
    } },
  };
  await assert.rejects(service.submit('user-1', 'other-batch-assignment', answer, db),
    (error) => error.statusCode === 404);
});

test('student assignment endpoints are documented', () => {
  const { paths } = require('../src/config/swagger');
  assert.ok(paths['/api/v1/student/assignments'].get);
  assert.ok(paths['/api/v1/student/assignments/{id}'].get);
  assert.ok(paths['/api/v1/student/assignments/{id}/submission'].post);
});

test('student assignment routes require authentication', async () => {
  const app = require('../src/app');
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => server.once('listening', resolve).once('error', reject));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/student/assignments`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
