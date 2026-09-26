const prisma = require('../../config/prisma');
const { fail, parseDate, key, occurs, started } = require('../admins/attendanceRules');
const { getTutorForUser } = require('./tutorScheduleService');

const title = (value) => value[0] + value.slice(1).toLowerCase();
const scheduleInclude = { academicSession: true, batch: { include: { grade: true, board: true } }, subject: true };

async function context(userId, query = {}) {
  const tutor = await getTutorForUser(userId);
  const date = parseDate(query.date || key(new Date()));
  const candidates = await prisma.classSchedule.findMany({
    where: { tutorId: tutor.id, status: 'SCHEDULED', startDate: { lte: date }, endDate: { gte: date } },
    include: scheduleInclude,
    orderBy: { startTime: 'asc' },
  });
  const schedules = candidates.filter((schedule) => occurs(schedule, date));
  const batchIds = [...new Set(schedules.map((schedule) => schedule.batchId))];
  const scheduleIds = schedules.map((schedule) => schedule.id);
  const [admissions, records] = await Promise.all([
    batchIds.length ? prisma.admission.findMany({
      where: { batchId: { in: batchIds }, status: 'ENROLLED', joiningDate: { lte: date }, student: { user: { status: 'ACTIVE' } } },
      include: { student: { include: { user: { select: { name: true } } } }, grade: true, board: true },
      orderBy: { student: { user: { name: 'asc' } } },
    }) : [],
    scheduleIds.length ? prisma.attendance.findMany({ where: { classScheduleId: { in: scheduleIds }, date } }) : [],
  ]);
  return {
    date: key(date),
    schedules: schedules.map((schedule) => ({
      id: schedule.id, classId: schedule.id, batchId: schedule.batchId, batchName: schedule.batch.name,
      grade: schedule.batch.grade.numericValue, board: schedule.batch.board.code, subject: schedule.subject.name,
      topic: schedule.topic || '', startTime: schedule.startTime, endTime: schedule.endTime,
      mode: title(schedule.learningMode), location: schedule.location || '', meetingUrl: schedule.meetingUrl || '',
      markable: started(schedule, date),
    })),
    students: admissions.map((admission) => ({
      id: admission.studentId, name: admission.student.user.name, batchId: admission.batchId,
      grade: admission.grade.numericValue, board: admission.board.code,
    })),
    records: records.map((record) => ({
      id: record.id, studentId: record.studentId, classId: record.classScheduleId,
      date: key(record.date), status: title(record.status), leaveRequestId: record.leaveRequestId,
    })),
  };
}

async function save(userId, input = {}) {
  const tutor = await getTutorForUser(userId);
  const date = parseDate(input.date);
  if (!Array.isArray(input.records) || !input.records.length || input.records.length > 2000) fail('Select between 1 and 2000 attendance records');
  const seen = new Set();
  await prisma.$transaction(async (tx) => {
    for (const row of input.records) {
      if (!row?.studentId || !row?.classId || !['Present', 'Absent', 'Leave'].includes(row.status)) fail('Invalid attendance record');
      const identityKey = `${row.studentId}:${row.classId}`;
      if (seen.has(identityKey)) fail('Duplicate attendance record');
      seen.add(identityKey);
      const schedule = await tx.classSchedule.findFirst({ where: { id: row.classId, tutorId: tutor.id } });
      if (!schedule || !occurs(schedule, date) || !started(schedule, date)) fail('Attendance is only available for your assigned class after it starts');
      const admission = await tx.admission.findFirst({
        where: { studentId: row.studentId, batchId: schedule.batchId, academicSessionId: schedule.academicSessionId, status: 'ENROLLED', joiningDate: { lte: date }, student: { user: { status: 'ACTIVE' } } },
      });
      if (!admission) fail('Student is not actively enrolled in this class');
      const leave = await tx.leaveRequest.findFirst({ where: { studentId: row.studentId, batchId: schedule.batchId, status: 'APPROVED', fromDate: { lte: date }, toDate: { gte: date } } });
      if (row.status === 'Leave' && !leave) fail('Leave attendance requires an approved leave request');
      const data = { status: leave ? 'LEAVE' : row.status.toUpperCase(), markedById: userId, leaveRequestId: leave?.id || null };
      await tx.attendance.upsert({
        where: { studentId_classScheduleId_date: { studentId: row.studentId, classScheduleId: row.classId, date } },
        create: { studentId: row.studentId, classScheduleId: row.classId, date, ...data },
        update: data,
      });
    }
  }, { isolationLevel: 'Serializable', timeout: 20000 });
  return context(userId, { date: input.date });
}

module.exports = { context, save };
