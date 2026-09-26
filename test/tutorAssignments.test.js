const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-assignments-test-secret-123456789';
const { assignmentInput, buildSubmissionRoster, ensureOwnedPair, parseAttachment } = require('../src/services/tutors/tutorAssignmentService');

const valid = { title: 'Algebra worksheet', type: 'Worksheet', instructions: 'Complete all questions.', batchId: 'batch-1', subjectId: 'subject-1', dueDate: '2026-09-30', totalMarks: 20, status: 'Published', attachmentName: '', attachmentData: '' };
test('tutor assignment input is normalized for Prisma', () => {
  const result = assignmentInput(valid);
  assert.equal(result.status, 'PUBLISHED'); assert.equal(result.totalMarks, 20); assert.equal(result.attachmentData, null);
});
test('assignment validates active tutor batch-subject ownership', () => {
  const context = { assignedBatches: [{ id: 'batch-1', subjects: [{ id: 'subject-1' }] }] };
  assert.doesNotThrow(() => ensureOwnedPair(context, 'batch-1', 'subject-1'));
  assert.throws(() => ensureOwnedPair(context, 'batch-1', 'subject-2'), /assigned to you/);
});
test('assignment attachments enforce supported data URLs', () => {
  assert.throws(() => parseAttachment({ attachmentName: 'bad.exe', attachmentData: 'data:application/x-msdownload;base64,AA==' }), /Only PDF/);
});
test('submission roster includes enrolled students who did not submit', () => {
  const admissions = [
    { studentId: 'student-1', student: { studentCode: 'STU-1', user: { name: 'Aditi Sharma' } } },
    { studentId: 'student-2', student: { studentCode: 'STU-2', user: { name: 'Mohit Kumar' } } },
  ];
  const submissions = [{ id: 'submission-1', studentId: 'student-1', status: 'SUBMITTED', submittedAt: new Date('2026-09-24T08:00:00.000Z'), reviewedAt: null, marks: null, fileName: 'work.pdf', feedback: null }];
  const roster = buildSubmissionRoster(admissions, submissions, new Date('2026-09-23T00:00:00.000Z'), 20);
  assert.equal(roster.length, 2);
  assert.equal(roster[0].status, 'Submitted');
  assert.equal(roster[0].isLate, true);
  assert.equal(roster[1].status, 'Not Submitted');
  assert.equal(roster[1].submissionId, null);
});
test('Tutor Assignment Swagger documents CRUD and review routes', () => {
  const spec = require('../src/config/swagger');
  assert.ok(spec.paths['/api/v1/tutor/assignments'].post); assert.ok(spec.paths['/api/v1/tutor/assignments/{id}'].put);
  assert.ok(spec.paths['/api/v1/tutor/assignments/{id}/archive'].patch); assert.ok(spec.paths['/api/v1/tutor/assignments/{id}/submissions/{submissionId}/review'].patch);
  assert.ok(spec.paths['/api/v1/tutor/assignments/{id}/submissions'].get);
  assert.ok(spec.paths['/api/v1/tutor/assignments/{id}/submissions/{submissionId}/file'].get);
});
