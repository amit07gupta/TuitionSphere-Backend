const prisma = require("../../config/prisma");
const { buildClassScheduleFilters } = require("./adminClassScheduleFilterService");

const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const scheduleTypes = ["SINGLE", "RECURRING"];
const statuses = ["SCHEDULED", "CANCELLED"];

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

function parseDate(value, label) {
  const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw httpError(`${label} is required`, 400);
  return date;
}

function parseTime(value, label) {
  const match = String(value || "").trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) throw httpError(`${label} must be a valid time`, 400);
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 23) throw httpError(`${label} must be a valid time`, 400);
  if (match[3]) {
    if (hours < 1 || hours > 12) throw httpError(`${label} must be a valid time`, 400);
    if (match[3] === "AM" && hours === 12) hours = 0;
    if (match[3] === "PM" && hours !== 12) hours += 12;
  }
  return { minutes: hours * 60 + minutes, value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` };
}

function validateInput(input = {}) {
  const batchId = String(input.batchId || "").trim();
  const subjectId = String(input.subjectId || "").trim();
  const tutorId = String(input.tutorId || "").trim();
  const scheduleType = String(input.scheduleType || "SINGLE").toUpperCase();
  const startDate = parseDate(input.startDate || input.date, "Start date");
  const endDate = parseDate(input.endDate || input.startDate || input.date, "End date");
  const startTime = parseTime(input.startTime, "Start time");
  const endTime = parseTime(input.endTime, "End time");
  const repeatDays = [...new Set((Array.isArray(input.repeatDays) ? input.repeatDays : []).map((day) => String(day).toUpperCase()))];
  const topic = String(input.topic || "").trim() || null;
  const location = String(input.location || "").trim() || null;
  const meetingUrl = String(input.meetingUrl || "").trim() || null;
  const status = String(input.status || "SCHEDULED").toUpperCase();
  if (!batchId || !subjectId || !tutorId) throw httpError("Batch, subject and tutor are required", 400);
  if (!scheduleTypes.includes(scheduleType)) throw httpError("Invalid schedule type", 400);
  if (!statuses.includes(status)) throw httpError("Invalid class schedule status", 400);
  if (endDate < startDate) throw httpError("End date cannot be before start date", 400);
  if (endTime.minutes <= startTime.minutes) throw httpError("End time must be after start time", 400);
  if (repeatDays.some((day) => !weekdays.includes(day))) throw httpError("Invalid repeat day", 400);
  if (scheduleType === "RECURRING" && !repeatDays.length) throw httpError("Select at least one repeat day", 400);
  const effectiveDays = scheduleType === "SINGLE" ? [weekdays[startDate.getUTCDay()]] : repeatDays;
  return { batchId, subjectId, tutorId, scheduleType, startDate, endDate, repeatDays: effectiveDays, startTime: startTime.value, endTime: endTime.value, startMinutes: startTime.minutes, endMinutes: endTime.minutes, topic, location, meetingUrl, status };
}

function occursOn(schedule, date) {
  if (date < schedule.startDate || date > schedule.endDate) return false;
  return schedule.repeatDays.includes(weekdays[date.getUTCDay()]);
}

function datesOverlap(candidate, existing) {
  const start = new Date(Math.max(candidate.startDate.getTime(), existing.startDate.getTime()));
  const end = new Date(Math.min(candidate.endDate.getTime(), existing.endDate.getTime()));
  if (end < start) return false;
  const cursor = new Date(start);
  let checked = 0;
  while (cursor <= end && checked < 800) {
    if (occursOn(candidate, cursor) && occursOn(existing, cursor)) return true;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    checked += 1;
  }
  return false;
}

async function validateRelationsAndConflicts(data, excludeId) {
  const assignment = await prisma.batchSubject.findUnique({
    where: { batchId_subjectId: { batchId: data.batchId, subjectId: data.subjectId } },
    include: { batch: { include: { academicSession: true } }, subject: true, tutor: true },
  });
  if (!assignment) throw httpError("Selected subject is not configured in this batch", 400);
  if (assignment.tutorId !== data.tutorId) throw httpError("Selected tutor is not assigned to this batch subject", 400);
  if (assignment.batch.status !== "ACTIVE") throw httpError("Classes can only be scheduled for an active batch", 409);
  if (assignment.batch.academicSession.status !== "ACTIVE") throw httpError("Classes can only be scheduled in the active academic session", 409);
  if (data.startDate < assignment.batch.academicSession.startDate || data.endDate > assignment.batch.academicSession.endDate) {
    throw httpError("Schedule dates must be within the academic session", 400);
  }
  const learningMode = assignment.batch.learningMode;
  if (learningMode === "ONLINE" && !data.meetingUrl) throw httpError("Meeting URL is required for an online class", 400);
  if (learningMode === "OFFLINE" && !data.location) throw httpError("Room or location is required for an offline class", 400);

  const possible = await prisma.classSchedule.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      status: "SCHEDULED",
      startDate: { lte: data.endDate },
      endDate: { gte: data.startDate },
      OR: [
        { batchId: data.batchId },
        { tutorId: data.tutorId },
        ...(learningMode === "OFFLINE" && data.location ? [{ learningMode: "OFFLINE", location: { equals: data.location, mode: "insensitive" } }] : []),
      ],
    },
  });
  const conflict = possible.find((item) => data.startMinutes < parseTime(item.endTime, "End time").minutes && data.endMinutes > parseTime(item.startTime, "Start time").minutes && datesOverlap(data, item));
  if (conflict?.batchId === data.batchId) throw httpError("This batch already has an overlapping class", 409);
  if (conflict?.tutorId === data.tutorId) throw httpError("This tutor already has an overlapping class", 409);
  if (conflict) throw httpError("This room is already occupied during the selected schedule", 409);
  return { academicSessionId: assignment.batch.academicSessionId, learningMode };
}

async function listClassSchedules(query) {
  return prisma.classSchedule.findMany({ where: buildClassScheduleFilters(query), include: scheduleInclude, orderBy: [{ startDate: "asc" }, { startTime: "asc" }] });
}

async function getClassScheduleById(id) {
  const schedule = await prisma.classSchedule.findUnique({ where: { id }, include: scheduleInclude });
  if (!schedule) throw httpError("Class schedule not found", 404);
  return schedule;
}

async function createClassSchedule(input) {
  const data = validateInput(input);
  const relations = await validateRelationsAndConflicts(data);
  return prisma.classSchedule.create({ data: { ...data, ...relations, startMinutes: undefined, endMinutes: undefined }, include: scheduleInclude });
}

async function updateClassSchedule(id, input) {
  await getClassScheduleById(id);
  const data = validateInput(input);
  const relations = await validateRelationsAndConflicts(data, id);
  return prisma.classSchedule.update({ where: { id }, data: { ...data, ...relations, startMinutes: undefined, endMinutes: undefined }, include: scheduleInclude });
}

async function cancelClassSchedule(id) {
  await getClassScheduleById(id);
  return prisma.classSchedule.update({ where: { id }, data: { status: "CANCELLED" }, include: scheduleInclude });
}

module.exports = { listClassSchedules, getClassScheduleById, createClassSchedule, updateClassSchedule, cancelClassSchedule };
