const { buildAttendanceFilters } = require('./adminAttendanceFilterService');
const prisma = require('../../config/prisma');
const { fail, parseDate, key, occurs, sessionsBetween, started } = require('./attendanceRules');
const title = (value) => value[0] + value.slice(1).toLowerCase();
const scheduleInclude = { subject: true, batch: { include: { grade: true, board: true } } };
const attendanceInclude = { student: { include: { user: { select: { name: true } } } }, classSchedule: { include: scheduleInclude } };
function normalizeAttendance(row) {
  const s = row.classSchedule;
  return { id: row.id, studentId: row.studentId, studentName: row.student.user.name, classId: row.classScheduleId, batchId: s.batchId, date: key(row.date), status: title(row.status), leaveRequestId: row.leaveRequestId, subject: s.subject.name, topic: s.topic, startTime: s.startTime, endTime: s.endTime, grade: s.batch.grade.numericValue, board: s.batch.board.code };
}
async function context(query = {}) {
  const filters = buildAttendanceFilters(query);
  const [batches, admissions, schedules, records, leaves] = await Promise.all([
    prisma.batch.findMany({ orderBy: { name: 'asc' } }),
    prisma.admission.findMany({ where: { status: 'ENROLLED' }, include: { student: { include: { user: { select: { name: true, status: true } } } }, grade: true, board: true } }),
    prisma.classSchedule.findMany({ include: scheduleInclude }),
    prisma.attendance.findMany({ where: filters.records, include: attendanceInclude, orderBy: { date: 'desc' } }),
    prisma.leaveRequest.findMany({ where: filters.leaves, include: { student: { include: { user: { select: { name: true } } } }, batch: { include: { grade: true, board: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  return {
    batches: batches.map((b) => ({ id: b.id, name: b.name, status: title(b.status) })),
    students: admissions.map((a) => ({ id: a.studentId, name: a.student.user.name, batchId: a.batchId, joiningDate: key(a.joiningDate), status: title(a.student.user.status), grade: a.grade.numericValue, board: a.board.code })),
    schedules: schedules.map((s) => ({ id: s.id, batchId: s.batchId, startDate: key(s.startDate), endDate: key(s.endDate), repeatDays: s.repeatDays, scheduleType: s.scheduleType, status: s.status, subject: s.subject.name, topic: s.topic || '', startTime: s.startTime, endTime: s.endTime })),
    records: records.map(normalizeAttendance),
    requests: leaves.map((l) => ({ ...l, studentName: l.student.user.name, grade: l.batch.grade.numericValue, board: l.batch.board.code, fromDate: key(l.fromDate), toDate: key(l.toDate), status: title(l.status), submittedAt: l.createdAt, affectedSessions: sessionsBetween(schedules.filter((s) => s.batchId === l.batchId), l.fromDate, l.toDate) })),
  };
}
async function save(input = {}, userId) {
  if (!input || typeof input !== "object") fail("Invalid attendance input");
  const date = parseDate(input.date);
  if (!Array.isArray(input.records) || !input.records.length || input.records.length > 2000) fail('Select between 1 and 2000 attendance records');
  const seen = new Set();
  await prisma.$transaction(async (tx) => {
    for (const row of input.records) {
      if (!row || !row.studentId || !row.classId || !['Present', 'Absent', 'Leave'].includes(row.status)) fail('Invalid attendance record');
      const unique = `${row.studentId}:${row.classId}`;
      if (seen.has(unique)) fail('Duplicate attendance record');
      seen.add(unique);
      const schedule = await tx.classSchedule.findUnique({ where: { id: row.classId } });
      if (!schedule || !occurs(schedule, date) || !started(schedule, date)) fail('Attendance is only available for a scheduled class that has started');
      const admission = await tx.admission.findFirst({ where: { studentId: row.studentId, batchId: schedule.batchId, academicSessionId: schedule.academicSessionId, status: 'ENROLLED', joiningDate: { lte: date }, student: { user: { status: 'ACTIVE' } } } });
      if (!admission) fail('Student is not enrolled in this class');
      const leave = await tx.leaveRequest.findFirst({ where: { studentId: row.studentId, batchId: schedule.batchId, status: 'APPROVED', fromDate: { lte: date }, toDate: { gte: date } } });
      if (row.status === 'Leave' && !leave) fail('Leave attendance requires an approved leave request');
      const data = { status: leave ? 'LEAVE' : row.status.toUpperCase(), markedById: userId, leaveRequestId: leave?.id || null };
      await tx.attendance.upsert({ where: { studentId_classScheduleId_date: { studentId: row.studentId, classScheduleId: row.classId, date } }, create: { studentId: row.studentId, classScheduleId: row.classId, date, ...data }, update: data });
    }
  }, { isolationLevel: 'Serializable', timeout: 20000 });
  return context();
}
async function review(id, input = {}, userId) {
  if (!input || typeof input !== "object") fail("Invalid leave review input");
  if (!['Approved', 'Rejected'].includes(input.status)) fail('Invalid review status');
  const reason = String(input.rejectionReason || '').trim();
  if (input.status === 'Rejected' && reason.length < 5) fail('Enter a rejection reason of at least 5 characters');
  await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findUnique({ where: { id } });
    if (!request) fail('Leave request not found', 404);
    if (request.status !== 'PENDING' && !(request.status === 'REJECTED' && input.status === 'Approved')) fail('This request cannot be reviewed again', 409);
    if (input.status === 'Approved') {
      const conflictingLeave = await tx.leaveRequest.findFirst({ where: { id: { not: id }, studentId: request.studentId, status: 'APPROVED', fromDate: { lte: request.toDate }, toDate: { gte: request.fromDate } }, select: { id: true } });
      if (conflictingLeave) fail('Another approved leave request already covers these dates', 409);
      const admission = await tx.admission.findFirst({ where: { studentId: request.studentId, batchId: request.batchId, status: 'ENROLLED' } });
      if (!admission) fail('Student is no longer enrolled in this batch', 409);
      const schedules = await tx.classSchedule.findMany({ where: { batchId: request.batchId, academicSessionId: admission.academicSessionId }, include: { subject: true } });
      const sessions = sessionsBetween(schedules, request.fromDate, request.toDate).filter((s) => s.date >= key(admission.joiningDate));
      if (!sessions.length) fail('No scheduled classes fall in this leave period', 409);
      const updated = await tx.leaveRequest.updateMany({ where: { id, status: request.status }, data: { status: 'APPROVED', rejectionReason: null, reviewedById: userId, reviewedAt: new Date() } });
      if (!updated.count) fail('This request was changed while being reviewed', 409);
      for (const session of sessions) {
        const identity = { studentId: request.studentId, classScheduleId: session.classId, date: parseDate(session.date) };
        const data = { status: 'LEAVE', leaveRequestId: id, markedById: userId };
        await tx.attendance.upsert({ where: { studentId_classScheduleId_date: identity }, create: { ...identity, ...data }, update: data });
      }
    } else {
      const updated = await tx.leaveRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED', rejectionReason: reason, reviewedById: userId, reviewedAt: new Date() } });
      if (!updated.count) fail('This request was changed while being reviewed', 409);
    }
  }, { isolationLevel: 'Serializable', timeout: 20000 });
  return context();
}
module.exports = { context, save, review };
