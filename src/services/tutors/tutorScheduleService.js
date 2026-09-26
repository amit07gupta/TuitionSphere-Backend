const prisma = require("../../config/prisma");
const { buildTutorScheduleFilters } = require("./tutorScheduleFilterService");

const scheduleInclude = {
  academicSession: true,
  batch: { include: { grade: true, board: true } },
  subject: true,
  tutor: { include: { user: { select: { id: true, name: true, email: true } } } },
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getTutorForUser(userId) {
  const tutor = await prisma.tutor.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!tutor) throw httpError("Tutor profile not found", 404);
  if (tutor.status !== "ACTIVE") throw httpError("Tutor profile is not active", 403);
  return tutor;
}

async function listTutorSchedule(userId, query = {}) {
  const tutor = await getTutorForUser(userId);
  return prisma.classSchedule.findMany({
    where: buildTutorScheduleFilters(tutor.id, query),
    include: scheduleInclude,
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
  });
}

async function getTutorScheduleContext(userId, query = {}) {
  const [schedules, academicSession] = await Promise.all([
    listTutorSchedule(userId, query),
    prisma.academicSession.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
  ]);
  return { schedules, academicSession };
}

module.exports = { getTutorForUser, listTutorSchedule, getTutorScheduleContext };
