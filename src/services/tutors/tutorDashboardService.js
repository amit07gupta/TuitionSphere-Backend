const prisma = require('../../config/prisma');
const { getTutorForUser } = require('./tutorScheduleService');

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const dateKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
function occursOn(schedule, key) {
  const start = schedule.startDate.toISOString().slice(0, 10), end = schedule.endDate.toISOString().slice(0, 10);
  if (key < start || key > end || schedule.status !== 'SCHEDULED') return false;
  if (schedule.scheduleType === 'SINGLE') return key === start;
  return schedule.repeatDays.includes(WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()]);
}
function nextOccurrence(schedules, now = new Date()) {
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  for (let offset = 0; offset <= 62; offset += 1) {
    const day = new Date(istNow); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + offset); const key = dateKey(day);
    const matches = schedules.filter((row) => occursOn(row, key) && (offset > 0 || row.startTime >= `${String(istNow.getHours()).padStart(2, '0')}:${String(istNow.getMinutes()).padStart(2, '0')}`)).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (matches[0]) return { date: key, startTime: matches[0].startTime, endTime: matches[0].endTime, subject: matches[0].subject.name, batchName: matches[0].batch.name, mode: matches[0].learningMode === 'ONLINE' ? 'Online' : 'Offline' };
  }
  return null;
}
async function getDashboard(userId, now = new Date()) {
  const tutor = await getTutorForUser(userId);
  const session = await prisma.academicSession.findFirst({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } });
  if (!session) return { academicSession: null, todayClasses: 0, assignedStudents: 0, activeUpdates: 0, assignmentsToReview: 0, nextClass: null };
  const assignments = await prisma.batchSubject.findMany({ where: { tutorId: tutor.id, batch: { academicSessionId: session.id, status: 'ACTIVE' } }, select: { batchId: true } });
  const batchIds = [...new Set(assignments.map((row) => row.batchId))];
  const schedules = await prisma.classSchedule.findMany({ where: { tutorId: tutor.id, academicSessionId: session.id, status: 'SCHEDULED' }, select: { scheduleType: true, startDate: true, endDate: true, repeatDays: true, startTime: true, endTime: true, learningMode: true, status: true, subject: { select: { name: true } }, batch: { select: { name: true } } } });
  const today = dateKey(now);
  const [assignedStudents, activeUpdates, assignmentsToReview] = await Promise.all([
    batchIds.length ? prisma.admission.count({ where: { academicSessionId: session.id, batchId: { in: batchIds }, status: 'ENROLLED', student: { user: { status: 'ACTIVE' } } } }) : 0,
    batchIds.length ? prisma.notice.count({ where: { createdById: userId, batchId: { in: batchIds }, status: 'PUBLISHED', publishDate: { lte: now }, OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] } }) : 0,
    prisma.assignmentSubmission.count({ where: { status: 'SUBMITTED', assignment: { tutorId: tutor.id, status: { not: 'ARCHIVED' } } } }),
  ]);
  return { academicSession: session, todayClasses: schedules.filter((row) => occursOn(row, today)).length, assignedStudents, activeUpdates, assignmentsToReview, nextClass: nextOccurrence(schedules, now) };
}
module.exports = { getDashboard, occursOn, nextOccurrence, dateKey };
