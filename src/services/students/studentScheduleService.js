const prisma = require('../../config/prisma');

async function getStudentSchedule(userId, db = prisma) {
  const student = await db.student.findUnique({
    where: { userId },
    select: { id: true, studentCode: true },
  });
  if (!student) {
    throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  }

  const admission = await db.admission.findFirst({
    where: { studentId: student.id, status: 'ENROLLED' },
    orderBy: { joiningDate: 'desc' },
    include: {
      grade: true,
      board: true,
      batch: true,
    },
  });
  if (!admission) return { studentCode: student.studentCode, enrollment: null, schedules: [] };

  const schedules = await db.classSchedule.findMany({
    where: { batchId: admission.batchId, academicSessionId: admission.academicSessionId },
    include: {
      subject: true,
      tutor: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
  });

  return {
    studentCode: student.studentCode,
    enrollment: {
      batchId: admission.batchId,
      batchName: admission.batch.name,
      grade: admission.grade.numericValue,
      board: admission.board.code,
      learningMode: admission.batch.learningMode,
    },
    schedules: schedules.map((item) => ({
      id: item.id,
      batchId: item.batchId,
      scheduleType: item.scheduleType,
      startDate: item.startDate,
      endDate: item.endDate,
      repeatDays: item.repeatDays,
      startTime: item.startTime,
      endTime: item.endTime,
      subject: item.subject.name,
      topic: item.topic,
      mentor: item.tutor.user.name,
      learningMode: item.learningMode,
      location: item.location,
      meetingUrl: item.meetingUrl,
      status: item.status,
    })),
  };
}

module.exports = { getStudentSchedule };
