const prisma = require('../../config/prisma');
const { getTutorForUser } = require('./tutorScheduleService');
const { archiveChange } = require('../admins/adminAssignmentService');

const labels = { DRAFT: 'Draft', PUBLISHED: 'Published', ARCHIVED: 'Archived', SUBMITTED: 'Submitted', REVIEWED: 'Reviewed' };
const assignmentTypes = new Set(['Homework', 'Worksheet', 'Practice Work', 'Project']);
const allowedMimeTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);
const assignmentSelect = {
  id: true, title: true, type: true, instructions: true, batchId: true, subjectId: true, tutorId: true,
  dueDate: true, totalMarks: true, status: true, archivedFromStatus: true, attachmentName: true, createdAt: true, updatedAt: true,
  batch: { select: { name: true } }, subject: { select: { name: true } }, tutor: { select: { user: { select: { name: true } } } },
};

function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function text(value, name, max, required = true) {
  const result = String(value || '').trim();
  if (required && !result) fail(`${name} is required`);
  if (result.length > max) fail(`${name} must be ${max} characters or fewer`);
  return result;
}
function normalize(row) {
  return { ...row, status: labels[row.status], dueDate: row.dueDate.toISOString().slice(0, 10), batchName: row.batch.name, subject: row.subject.name, tutorName: row.tutor.user.name };
}
function mimeForName(name = '') {
  const extension = String(name).toLowerCase().split('.').pop();
  return ({ pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' })[extension] || 'application/octet-stream';
}
function downloadData(bytes, name) { return bytes ? `data:${mimeForName(name)};base64,${Buffer.from(bytes).toString('base64')}` : ''; }
function parseAttachment(input = {}) {
  const name = text(input.attachmentName, 'Attachment name', 255, false);
  const dataUrl = String(input.attachmentData || '');
  if (!name && !dataUrl) return { attachmentName: null, attachmentData: null };
  if (!name || !dataUrl) fail('Attachment name and file are both required');
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || !allowedMimeTypes.has(match[1])) fail('Only PDF, DOC, DOCX, JPG or PNG files are allowed');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 1024 * 1024) fail('Attachment must be 1 MB or smaller');
  return { attachmentName: name, attachmentData: bytes };
}
function assignmentInput(input = {}) {
  const type = text(input.type, 'Type', 50);
  if (!assignmentTypes.has(type)) fail('Invalid assignment type');
  const status = String(input.status || '').toUpperCase();
  if (!['DRAFT', 'PUBLISHED'].includes(status)) fail('Status must be Draft or Published');
  const dueDateText = String(input.dueDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateText)) fail('Due date must use YYYY-MM-DD');
  const dueDate = new Date(`${dueDateText}T00:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) fail('Invalid due date');
  const totalMarks = Number(input.totalMarks);
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 10000) fail('Total marks must be a whole number from 1 to 10000');
  return {
    title: text(input.title, 'Title', 200), type, instructions: text(input.instructions, 'Instructions', 10000),
    batchId: text(input.batchId, 'Batch', 100), subjectId: text(input.subjectId, 'Subject', 100), dueDate, totalMarks, status,
    ...parseAttachment(input),
  };
}
async function contextForTutor(tutorId) {
  const session = await prisma.academicSession.findFirst({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } });
  if (!session) return { academicSession: null, assignedBatches: [] };
  const rows = await prisma.batchSubject.findMany({
    where: { tutorId, batch: { academicSessionId: session.id, status: 'ACTIVE' }, subject: { status: 'ACTIVE' } },
    select: { batch: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } },
    orderBy: [{ batch: { name: 'asc' } }, { subject: { name: 'asc' } }],
  });
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.batch.id)) map.set(row.batch.id, { ...row.batch, subjects: [] });
    map.get(row.batch.id).subjects.push(row.subject);
  }
  return { academicSession: session, assignedBatches: [...map.values()] };
}
function ensureOwnedPair(context, batchId, subjectId) {
  const batch = context.assignedBatches.find((item) => item.id === batchId);
  if (!batch || !batch.subjects.some((item) => item.id === subjectId)) fail('Choose a subject assigned to you in an active batch', 403);
}
const submissionsSelect = { id: true, assignmentId: true, studentId: true, status: true, marks: true, feedback: true, submittedAt: true, reviewedAt: true, fileName: true, student: { select: { studentCode: true, user: { select: { name: true } } } } };
function normalizeSubmission({ student, ...row }) { return { ...row, status: labels[row.status], studentName: student.user.name, studentCode: student.studentCode }; }
function initials(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}
function buildSubmissionRoster(admissions, submissions, dueDate, totalMarks) {
  const submissionByStudent = new Map(submissions.map((submission) => [submission.studentId, submission]));
  const dueEnd = new Date(dueDate);
  dueEnd.setUTCHours(23, 59, 59, 999);
  return admissions.map((admission) => {
    const submission = submissionByStudent.get(admission.studentId);
    const studentName = admission.student.user.name;
    if (!submission) {
      return {
        studentId: admission.studentId, studentCode: admission.student.studentCode, studentName,
        initials: initials(studentName), status: 'Not Submitted', submissionId: null,
        submittedAt: null, reviewedAt: null, isLate: false, marks: null,
        totalMarks, fileName: null, feedback: null,
      };
    }
    return {
      studentId: admission.studentId, studentCode: admission.student.studentCode, studentName,
      initials: initials(studentName), status: submission.status === 'REVIEWED' ? 'Graded' : 'Submitted',
      submissionId: submission.id, submittedAt: submission.submittedAt, reviewedAt: submission.reviewedAt,
      isLate: submission.submittedAt > dueEnd, marks: submission.marks, totalMarks,
      fileName: submission.fileName, feedback: submission.feedback,
    };
  });
}
async function list(userId, query = {}) {
  const tutor = await getTutorForUser(userId);
  const context = await contextForTutor(tutor.id);
  const where = { tutorId: tutor.id };
  if (query.status) { const status = String(query.status).toUpperCase(); if (!Object.hasOwn(labels, status) || status === 'SUBMITTED' || status === 'REVIEWED') fail('Invalid assignment status'); where.status = status; }
  if (query.batchId) { if (!context.assignedBatches.some((b) => b.id === query.batchId)) fail('Batch is not assigned to this tutor', 403); where.batchId = String(query.batchId); }
  if (query.subjectId) where.subjectId = String(query.subjectId);
  if (query.search) where.title = { contains: String(query.search).trim(), mode: 'insensitive' };
  const rows = await prisma.assignment.findMany({ where, select: { ...assignmentSelect, submissions: { select: submissionsSelect, orderBy: { submittedAt: 'desc' } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
  return { ...context, assignments: rows.map(({ submissions, ...row }) => ({ ...normalize(row), submissions: submissions.map(normalizeSubmission), submittedCount: submissions.length, reviewedCount: submissions.filter((s) => s.status === 'REVIEWED').length })) };
}
async function detail(userId, id) {
  const tutor = await getTutorForUser(userId);
  const row = await prisma.assignment.findFirst({ where: { id, tutorId: tutor.id }, select: { ...assignmentSelect, attachmentData: true, submissions: { select: { ...submissionsSelect, fileData: true }, orderBy: { submittedAt: 'desc' } } } });
  if (!row) fail('Assignment not found', 404);
  return { ...normalize(row), attachmentData: downloadData(row.attachmentData, row.attachmentName), submissions: row.submissions.map(({ fileData, ...s }) => ({ ...normalizeSubmission(s), fileData: downloadData(fileData, s.fileName) })) };
}
async function submissionRoster(userId, id) {
  const tutor = await getTutorForUser(userId);
  const assignment = await prisma.assignment.findFirst({
    where: { id, tutorId: tutor.id },
    select: {
      id: true, title: true, batchId: true, dueDate: true, totalMarks: true,
      batch: { select: { name: true, academicSessionId: true } },
      subject: { select: { name: true } },
      submissions: { select: { ...submissionsSelect, studentId: true } },
    },
  });
  if (!assignment) fail('Assignment not found', 404);
  const admissions = await prisma.admission.findMany({
    where: {
      batchId: assignment.batchId,
      academicSessionId: assignment.batch.academicSessionId,
      status: 'ENROLLED',
      student: { user: { status: 'ACTIVE' } },
    },
    select: {
      studentId: true,
      student: { select: { studentCode: true, user: { select: { name: true } } } },
    },
    orderBy: { student: { user: { name: 'asc' } } },
  });
  const students = buildSubmissionRoster(admissions, assignment.submissions, assignment.dueDate, assignment.totalMarks);
  const graded = students.filter((student) => student.status === 'Graded').length;
  const pending = students.filter((student) => student.status === 'Submitted').length;
  const notSubmitted = students.filter((student) => student.status === 'Not Submitted').length;
  return {
    assignment: {
      id: assignment.id, title: assignment.title, batchId: assignment.batchId,
      batchName: assignment.batch.name, subject: assignment.subject.name,
      dueDate: assignment.dueDate.toISOString().slice(0, 10), totalMarks: assignment.totalMarks,
    },
    summary: {
      total: students.length, submitted: graded + pending, graded, pending,
      notSubmitted, late: students.filter((student) => student.isLate).length,
    },
    students,
  };
}
async function submissionFile(userId, assignmentId, submissionId) {
  const tutor = await getTutorForUser(userId);
  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: submissionId, assignmentId, assignment: { tutorId: tutor.id } },
    select: { fileName: true, fileData: true },
  });
  if (!submission) fail('Submission not found', 404);
  if (!submission.fileName || !submission.fileData) fail('Submission file not found', 404);
  return { fileName: submission.fileName, fileData: downloadData(submission.fileData, submission.fileName) };
}
async function create(userId, input) {
  const tutor = await getTutorForUser(userId); const data = assignmentInput(input); const context = await contextForTutor(tutor.id);
  ensureOwnedPair(context, data.batchId, data.subjectId);
  const row = await prisma.assignment.create({ data: { ...data, tutorId: tutor.id }, select: assignmentSelect });
  return normalize(row);
}
async function update(userId, id, input) {
  const tutor = await getTutorForUser(userId); const data = assignmentInput(input); const context = await contextForTutor(tutor.id);
  ensureOwnedPair(context, data.batchId, data.subjectId);
  const current = await prisma.assignment.findFirst({ where: { id, tutorId: tutor.id }, include: { _count: { select: { submissions: true } } } });
  if (!current) fail('Assignment not found', 404);
  if (current.status === 'ARCHIVED') fail('Restore the assignment before editing it', 409);
  if (current._count.submissions && (current.batchId !== data.batchId || current.subjectId !== data.subjectId || current.totalMarks !== data.totalMarks)) fail('Batch, subject and marks cannot change after submissions exist', 409);
  const row = await prisma.assignment.update({ where: { id }, data, select: assignmentSelect }); return normalize(row);
}
async function updateArchive(userId, id, input) {
  const tutor = await getTutorForUser(userId);
  return prisma.$transaction(async (tx) => {
    const current = await tx.assignment.findFirst({ where: { id, tutorId: tutor.id } }); if (!current) fail('Assignment not found', 404);
    const change = archiveChange(current, input); const result = await tx.assignment.updateMany({ where: { id, tutorId: tutor.id, status: current.status, updatedAt: current.updatedAt }, data: change });
    if (!result.count) fail('Assignment changed. Refresh before trying again.', 409);
    return normalize(await tx.assignment.findUnique({ where: { id }, select: assignmentSelect }));
  });
}
async function reviewSubmission(userId, assignmentId, submissionId, input = {}) {
  const tutor = await getTutorForUser(userId); const marks = Number(input.marks); const feedback = text(input.feedback, 'Feedback', 2000);
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tutorId: tutor.id }, select: { totalMarks: true } });
  if (!assignment) fail('Assignment not found', 404);
  if (!Number.isInteger(marks) || marks < 0 || marks > assignment.totalMarks) fail(`Marks must be between 0 and ${assignment.totalMarks}`);
  const submission = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignmentId } }); if (!submission) fail('Submission not found', 404);
  const row = await prisma.assignmentSubmission.update({ where: { id: submissionId }, data: { marks, feedback, status: 'REVIEWED', reviewedAt: new Date() }, select: submissionsSelect });
  return normalizeSubmission(row);
}

module.exports = {
  assignmentInput, parseAttachment, list, detail, submissionRoster, submissionFile,
  create, update, updateArchive, reviewSubmission, ensureOwnedPair, buildSubmissionRoster,
};
