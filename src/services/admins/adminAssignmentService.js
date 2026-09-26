const { buildAssignmentFilters } = require('./adminAssignmentFilterService');
const prisma = require('../../config/prisma');
const labels = { DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived', SUBMITTED: 'Submitted', REVIEWED: 'Reviewed' };
const identity = { id: true, title: true, type: true, instructions: true, batchId: true, subjectId: true, tutorId: true, dueDate: true, totalMarks: true, status: true, createdAt: true, updatedAt: true, attachmentName: true,
  batch: { select: { name: true } }, subject: { select: { name: true } }, tutor: { select: { user: { select: { name: true } } } } };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function normalize(row) {
  return { ...row, status: labels[row.status], dueDate: row.dueDate.toISOString().slice(0, 10), batchName: row.batch.name, subject: row.subject.name, tutorName: row.tutor.user.name };
}
const downloadData = (bytes) => bytes ? `data:application/octet-stream;base64,${Buffer.from(bytes).toString('base64')}` : null;
async function list(query = {}) {
  const rows = await prisma.assignment.findMany({ where: buildAssignmentFilters(query), select: { ...identity, submissions: { select: { status: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
  return rows.map(({ submissions, ...row }) => ({ ...normalize(row), submittedCount: submissions.length, reviewedCount: submissions.filter((s) => s.status === 'REVIEWED').length }));
}
async function detail(id) {
  const row = await prisma.assignment.findUnique({ where: { id }, select: { ...identity, attachmentData: true, submissions: { select: { id: true, assignmentId: true, studentId: true, status: true, marks: true, feedback: true, submittedAt: true, reviewedAt: true, fileName: true, fileData: true, student: { select: { studentCode: true, user: { select: { name: true } } } } }, orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }] } } });
  if (!row) fail('Assignment not found', 404);
  return { ...normalize(row), attachmentData: downloadData(row.attachmentData), submissions: row.submissions.map(({ student, fileData, ...submission }) => ({ ...submission, status: labels[submission.status], studentName: student.user.name, studentCode: student.studentCode, fileData: downloadData(fileData) })) };
}
function archiveChange(current, input) {
  if (!input || !['archive', 'restore'].includes(input.action)) fail('Choose archive or restore');
  if (input.expectedStatus !== labels[current.status]) fail('Assignment changed. Refresh before trying again.', 409);
  if (input.action === 'archive') {
    if (current.status === 'ARCHIVED') fail('Assignment is already archived', 409);
    return { status: 'ARCHIVED', archivedFromStatus: current.status };
  }
  if (current.status !== 'ARCHIVED') fail('Only archived assignments can be restored', 409);
  // Restore a draft as draft; archiving must not publish it.
  return { status: current.archivedFromStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT', archivedFromStatus: null };
}
async function updateArchive(id, input, userId) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.assignment.findUnique({ where: { id } });
    if (!current) fail('Assignment not found', 404);
    const change = archiveChange(current, input);
    const result = await tx.assignment.updateMany({ where: { id, status: current.status, updatedAt: current.updatedAt }, data: { ...change, adminUpdatedById: userId } });
    if (!result.count) fail('Assignment changed. Refresh before trying again.', 409);
    const row = await tx.assignment.findUnique({ where: { id }, select: { ...identity, submissions: { select: { status: true } } } });
    const { submissions, ...assignment } = row;
    return { ...normalize(assignment), submittedCount: submissions.length, reviewedCount: submissions.filter((s) => s.status === 'REVIEWED').length };
  });
}
module.exports = { list, detail, updateArchive, archiveChange };
