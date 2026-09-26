const prisma = require('../../config/prisma');
const { fail, parseDate, key, sessionsBetween } = require('../admins/attendanceRules');

const title = (value) => value[0] + value.slice(1).toLowerCase();
const leaveTypes = new Set(['Medical', 'Family Emergency', 'Personal', 'School Examination', 'Other']);

async function studentFor(userId, db) {
  const student = await db.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) fail('Student profile not found', 404);
  return student;
}

async function currentAdmission(studentId, db) {
  return db.admission.findFirst({
    where: { studentId, status: 'ENROLLED' },
    orderBy: { joiningDate: 'desc' },
    include: { batch: true, grade: true, board: true },
  });
}

function validateLeave(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((field) => !['fromDate', 'toDate', 'type', 'reason'].includes(field))) fail('Invalid leave request');
  const fromDate = parseDate(input.fromDate);
  const toDate = parseDate(input.toDate);
  if (toDate < fromDate || toDate - fromDate > 366 * 86400000) fail('Leave period must be within one year');
  const type = String(input.type || '').trim();
  const reason = String(input.reason || '').trim();
  if (!leaveTypes.has(type)) fail('Select a valid leave type');
  if (reason.length < 10 || reason.length > 500) fail('Reason must contain 10 to 500 characters');
  return { fromDate, toDate, type, reason };
}

async function eligibleSessions(admission, dates, db) {
  if (!admission || key(dates.fromDate) < key(admission.joiningDate)) fail('Leave dates must be within your current enrollment', 409);
  const schedules = await db.classSchedule.findMany({
    where: { batchId: admission.batchId, academicSessionId: admission.academicSessionId },
    include: { subject: true },
  });
  const sessions = sessionsBetween(schedules, dates.fromDate, dates.toDate);
  if (!sessions.length) fail('No scheduled classes fall in this leave period', 409);
  return sessions;
}

async function checkOverlap(studentId, dates, excludeId, db) {
  const overlap = await db.leaveRequest.findFirst({
    where: {
      studentId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: ['PENDING', 'APPROVED'] },
      fromDate: { lte: dates.toDate },
      toDate: { gte: dates.fromDate },
    },
    select: { id: true },
  });
  if (overlap) fail('A pending or approved leave request already covers these dates', 409);
}

async function context(userId, db = prisma) {
  const student = await studentFor(userId, db);
  const admission = await currentAdmission(student.id, db);
  const [records, requests] = await Promise.all([
    db.attendance.findMany({
      where: { studentId: student.id },
      include: { classSchedule: { include: { subject: true, tutor: { include: { user: { select: { name: true } } } } } } },
      orderBy: { date: 'desc' },
    }),
    db.leaveRequest.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  const batchIds = [...new Set([...requests.map((request) => request.batchId), admission?.batchId].filter(Boolean))];
  const schedules = batchIds.length ? await db.classSchedule.findMany({
    where: { batchId: { in: batchIds } }, include: { subject: true },
  }) : [];
  return {
    enrollment: admission ? {
      batchId: admission.batchId,
      batchName: admission.batch.name,
      grade: admission.grade.numericValue,
      board: admission.board.code,
    } : null,
    schedules: admission ? schedules.filter((item) => item.batchId === admission.batchId && item.academicSessionId === admission.academicSessionId).map((item) => ({
      id: item.id, batchId: item.batchId, startDate: key(item.startDate), endDate: key(item.endDate),
      repeatDays: item.repeatDays, scheduleType: item.scheduleType, status: item.status,
      subject: item.subject.name, topic: item.topic || '', startTime: item.startTime, endTime: item.endTime,
    })) : [],
    records: records.map((item) => ({
      id: item.id, classId: item.classScheduleId, date: key(item.date), status: title(item.status),
      subject: item.classSchedule.subject.name, topic: item.classSchedule.topic || '',
      startTime: item.classSchedule.startTime, endTime: item.classSchedule.endTime,
      mentor: item.classSchedule.tutor.user.name,
      mode: title(item.classSchedule.learningMode), location: item.classSchedule.location,
    })),
    requests: requests.map((item) => ({
      id: item.id, fromDate: key(item.fromDate), toDate: key(item.toDate), type: item.type,
      reason: item.reason, status: title(item.status), submittedAt: item.createdAt,
      rejectionReason: item.rejectionReason,
      affectedSessions: sessionsBetween(schedules.filter((schedule) => schedule.batchId === item.batchId), item.fromDate, item.toDate),
    })),
  };
}

async function createLeave(userId, input, db = prisma) {
  const student = await studentFor(userId, db);
  const admission = await currentAdmission(student.id, db);
  if (!admission) fail('An active enrollment is required to request leave', 409);
  const data = validateLeave(input);
  await eligibleSessions(admission, data, db);
  await checkOverlap(student.id, data, null, db);
  await db.leaveRequest.create({ data: { studentId: student.id, batchId: admission.batchId, ...data } });
  return context(userId, db);
}

async function updateLeave(userId, id, input, db = prisma) {
  const student = await studentFor(userId, db);
  const request = await db.leaveRequest.findFirst({ where: { id, studentId: student.id } });
  if (!request) fail('Leave request not found', 404);
  if (request.status !== 'PENDING') fail('Only pending leave requests can be edited', 409);
  const admission = await currentAdmission(student.id, db);
  if (!admission || request.batchId !== admission.batchId) fail('Leave request is outside your current enrollment', 409);
  const data = validateLeave(input);
  await eligibleSessions(admission, data, db);
  await checkOverlap(student.id, data, id, db);
  const updated = await db.leaveRequest.updateMany({ where: { id, studentId: student.id, status: 'PENDING' }, data });
  if (!updated.count) fail('Only pending leave requests can be edited', 409);
  return context(userId, db);
}

async function cancelLeave(userId, id, db = prisma) {
  const student = await studentFor(userId, db);
  const request = await db.leaveRequest.findFirst({ where: { id, studentId: student.id } });
  if (!request) fail('Leave request not found', 404);
  if (request.status !== 'PENDING') fail('Only pending leave requests can be cancelled', 409);
  const updated = await db.leaveRequest.updateMany({ where: { id, studentId: student.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  if (!updated.count) fail('Only pending leave requests can be cancelled', 409);
  return context(userId, db);
}

module.exports = { context, createLeave, updateLeave, cancelLeave, validateLeave };
