const prisma = require('../../config/prisma');

const mimeByExtension = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const statusLabels = { SUBMITTED: 'Submitted', REVIEWED: 'Reviewed' };
const submissionSelect = {
  id: true, assignmentId: true, status: true, fileName: true, marks: true,
  feedback: true, submittedAt: true, reviewedAt: true,
};
const assignmentSelect = {
  id: true, title: true, type: true, instructions: true, batchId: true,
  dueDate: true, totalMarks: true, status: true, attachmentName: true,
  subject: { select: { name: true } },
  tutor: { select: { user: { select: { name: true } } } },
};

function fail(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}
function mimeFor(name) {
  return mimeByExtension[String(name || '').toLowerCase().split('.').pop()] || '';
}
function fileUrl(bytes, name) {
  return bytes && name ? `data:${mimeFor(name) || 'application/octet-stream'};base64,${Buffer.from(bytes).toString('base64')}` : '';
}
function normalizeSubmission(row, includeFile = false) {
  if (!row) return null;
  const result = {
    id: row.id, assignmentId: row.assignmentId, status: statusLabels[row.status],
    fileName: row.fileName, fileType: mimeFor(row.fileName), marks: row.marks,
    feedback: row.feedback, submittedAt: row.submittedAt, reviewedAt: row.reviewedAt,
  };
  if (includeFile) result.fileData = fileUrl(row.fileData, row.fileName);
  return result;
}
function normalizeAssignment(row, includeFiles = false) {
  const result = {
    id: row.id, title: row.title, type: row.type, instructions: row.instructions,
    batchId: row.batchId, dueDate: row.dueDate.toISOString().slice(0, 10),
    totalMarks: row.totalMarks, status: 'Published', subject: row.subject.name,
    tutorName: row.tutor.user.name, attachmentName: row.attachmentName,
    attachmentType: mimeFor(row.attachmentName),
    submission: normalizeSubmission(row.submissions[0], includeFiles),
  };
  if (includeFiles) result.attachmentData = fileUrl(row.attachmentData, row.attachmentName);
  return result;
}
async function studentAndAdmission(userId, db) {
  const student = await db.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) fail('Student profile not found', 404);
  const admission = await db.admission.findFirst({
    where: { studentId: student.id, status: 'ENROLLED' },
    orderBy: { joiningDate: 'desc' },
    select: { batchId: true, batch: { select: { name: true } } },
  });
  return { student, admission };
}
function submittedBy(studentId, includeFile = false) {
  return {
    where: { studentId },
    select: includeFile ? { ...submissionSelect, fileData: true } : submissionSelect,
    take: 1,
  };
}
async function list(userId, db = prisma) {
  const { student, admission } = await studentAndAdmission(userId, db);
  if (!admission) return { enrollment: null, assignments: [] };
  const rows = await db.assignment.findMany({
    where: { batchId: admission.batchId, status: 'PUBLISHED' },
    select: { ...assignmentSelect, submissions: submittedBy(student.id) },
    orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
  });
  return {
    enrollment: { batchId: admission.batchId, batchName: admission.batch.name },
    assignments: rows.map((row) => normalizeAssignment(row)),
  };
}
async function detail(userId, id, db = prisma) {
  const { student, admission } = await studentAndAdmission(userId, db);
  if (!admission) fail('Assignment not found', 404);
  const row = await db.assignment.findFirst({
    where: { id, batchId: admission.batchId, status: 'PUBLISHED' },
    select: {
      ...assignmentSelect, attachmentData: true,
      submissions: submittedBy(student.id, true),
    },
  });
  if (!row) fail('Assignment not found', 404);
  return normalizeAssignment(row, true);
}
function parseSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some((key) => !['fileName', 'fileData'].includes(key))) fail('Invalid submission');
  const fileName = String(input.fileName || '').trim();
  if (!fileName || fileName.length > 255) fail('File name must be 1 to 255 characters');
  const mime = mimeFor(fileName);
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(input.fileData || ''));
  if (!mime || !match || match[1] !== mime) fail('Only PDF, DOC, DOCX, JPG or PNG files are allowed');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 1024 * 1024 || bytes.toString('base64') !== match[2])
    fail('Document must be 1 MB or smaller');
  const extension = fileName.toLowerCase().split('.').pop();
  const signature = extension === 'pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : extension === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : extension === 'jpg' || extension === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
        : extension === 'docx' ? bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'))
          : bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
  if (!signature) fail('File content does not match its format');
  return { fileName, fileData: bytes };
}
async function submit(userId, assignmentId, input, db = prisma) {
  const file = parseSubmission(input);
  const { student, admission } = await studentAndAdmission(userId, db);
  if (!admission) fail('An active enrollment is required to submit work', 409);
  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId, batchId: admission.batchId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!assignment) fail('Assignment not found', 404);
  const key = { assignmentId_studentId: { assignmentId, studentId: student.id } };
  const previous = await db.assignmentSubmission.findUnique({ where: key, select: { id: true, status: true } });
  if (previous?.status === 'REVIEWED') fail('Reviewed submissions cannot be replaced', 409);
  let row;
  if (previous) {
    const result = await db.assignmentSubmission.updateMany({
      where: { id: previous.id, assignmentId, studentId: student.id, status: 'SUBMITTED' },
      data: { ...file, submittedAt: new Date() },
    });
    if (!result.count) fail('Submission was reviewed. Refresh the page.', 409);
    row = await db.assignmentSubmission.findUnique({ where: key, select: submissionSelect });
  } else {
    try {
      row = await db.assignmentSubmission.create({
        data: { assignmentId, studentId: student.id, ...file },
        select: submissionSelect,
      });
    } catch (error) {
      if (error.code === 'P2002') fail('Submission changed. Refresh the page.', 409);
      throw error;
    }
  }
  return normalizeSubmission(row);
}

module.exports = { list, detail, submit, parseSubmission };
