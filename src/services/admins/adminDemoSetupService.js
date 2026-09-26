const prisma = require("../../config/prisma");
const { hasScheduledDay, protectBookings } = require('./demoSetupRules');
const { buildDemoSetupFilters } = require("./adminDemoSetupFilterService");

const statuses = ["ACTIVE", "INACTIVE"];
const modes = ["ONLINE", "OFFLINE"];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const demoSetupInclude = {
  academicSession: true,
  grade: true,
  tutor: { include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } } },
  boards: { include: { board: true } },
  timeSlots: { orderBy: { startTime: "asc" } },
};

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw createHttpError(`${label} must be a valid date`, 400);
  return date;
}

function uniqueList(value) {
  return [...new Set(Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [])];
}

function validateSlots(value) {
  const slots = Array.isArray(value) ? value.map((slot) => ({
    startTime: String(slot?.startTime || "").trim(),
    endTime: String(slot?.endTime || "").trim(),
    capacity: Number(slot?.capacity),
  })) : [];

  if (!slots.length) throw createHttpError("Add at least one demo time slot", 400);
  for (const slot of slots) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime)) {
      throw createHttpError("Demo slot times must use HH:mm format", 400);
    }
    if (slot.endTime <= slot.startTime) throw createHttpError("Every slot end time must be after its start time", 400);
    if (!Number.isInteger(slot.capacity) || slot.capacity < 1) throw createHttpError("Every slot capacity must be a positive whole number", 400);
  }
  const ordered = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (ordered.some((slot, index) => index > 0 && slot.startTime < ordered[index - 1].endTime)) {
    throw createHttpError("Demo time slots cannot overlap", 400);
  }
  return ordered;
}

function validateInput(input = {}) {
  const name = String(input.name || "").trim();
  const academicSessionId = String(input.academicSessionId || "").trim();
  const tutorId = String(input.tutorId || "").trim();
  const gradeId = String(input.gradeId || "").trim();
  const boardIds = uniqueList(input.boardIds);
  const stream = String(input.stream || "").trim() || null;
  const mode = String(input.mode || "OFFLINE").trim().toUpperCase();
  const demoStartDate = parseDate(input.demoStartDate, "Demo start date");
  const demoEndDate = parseDate(input.demoEndDate, "Demo end date");
  const availableDays = uniqueList(input.availableDays);
  const timeSlots = validateSlots(input.timeSlots);
  const status = String(input.status || "ACTIVE").trim().toUpperCase();

  if (!name) throw createHttpError("Demo setup name is required", 400);
  if (!academicSessionId) throw createHttpError("Academic session is required", 400);
  if (!tutorId) throw createHttpError("Tutor is required", 400);
  if (!gradeId) throw createHttpError("Grade is required", 400);
  if (!boardIds.length) throw createHttpError("Select at least one board", 400);
  if (!modes.includes(mode)) throw createHttpError("Demo mode must be ONLINE or OFFLINE", 400);
  if (demoEndDate < demoStartDate) throw createHttpError("Demo end date must be on or after the start date", 400);
  if (!availableDays.length || availableDays.some((day) => !weekdays.includes(day))) throw createHttpError("Select valid demo weekdays", 400);
  if (!statuses.includes(status)) throw createHttpError("Demo setup status must be ACTIVE or INACTIVE", 400);
  if (!hasScheduledDay(demoStartDate, demoEndDate, availableDays)) throw createHttpError("Select a weekday that occurs within the demo date range", 400);

  return { name, academicSessionId, tutorId, gradeId, boardIds, stream, mode, demoStartDate, demoEndDate, availableDays, timeSlots, status };
}

async function validateRelations(data) {
  const [session, grade, gradeBoards, tutor] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: data.academicSessionId } }),
    prisma.grade.findUnique({ where: { id: data.gradeId } }),
    prisma.gradeBoard.findMany({
      where: { gradeId: data.gradeId, boardId: { in: data.boardIds } },
      select: { boardId: true },
    }),
    prisma.tutor.findUnique({
      where: { id: data.tutorId },
      include: { boards: true, grades: true },
    }),
  ]);

  if (!session) throw createHttpError("Academic session does not exist", 400);
  if (!grade) throw createHttpError("Grade does not exist", 400);
  if (gradeBoards.length !== data.boardIds.length) throw createHttpError("A selected board is not applicable to this grade", 400);
  if (!tutor || tutor.status !== "ACTIVE") throw createHttpError("Select an active tutor", 400);
  if (!tutor.grades.some((item) => item.gradeId === data.gradeId)) throw createHttpError("Tutor is not assigned to this grade", 400);
  if (data.boardIds.some((boardId) => !tutor.boards.some((item) => item.boardId === boardId))) {
    throw createHttpError("Tutor is not assigned to every selected board", 400);
  }
  if (tutor.modes.length && !tutor.modes.some((mode) => mode.toUpperCase() === data.mode)) {
    throw createHttpError("Tutor does not support the selected demo mode", 400);
  }
  const seniorGrade = grade.numericValue >= 11;
  if (seniorGrade && !data.stream) throw createHttpError("Select a stream for Grade 11 or Grade 12", 400);
  if (!seniorGrade && data.stream) throw createHttpError("Stream is only applicable to Grade 11 and Grade 12", 400);
  if (data.stream && tutor.streams.length && !tutor.streams.includes(data.stream)) throw createHttpError("Tutor is not assigned to this stream", 400);
  if (data.demoStartDate < session.startDate || data.demoEndDate > session.endDate) {
    throw createHttpError("Demo dates must remain within the academic session", 400);
  }
}

function listDemoSetups(query = {}) {
  return prisma.demoSetup.findMany({
    where: buildDemoSetupFilters(query),
    include: demoSetupInclude,
    orderBy: [{ grade: { numericValue: "asc" } }, { name: "asc" }],
  });
}

function listPublicDemoSetups() {
  return prisma.demoSetup.findMany({
    where: {
      status: "ACTIVE",
      demoEndDate: { gte: new Date() },
      academicSession: { status: "ACTIVE" },
    },
    include: demoSetupInclude,
    orderBy: [{ grade: { numericValue: "asc" } }, { demoStartDate: "asc" }],
  });
}

async function getDemoSetupById(id) {
  const setup = await prisma.demoSetup.findUnique({ where: { id }, include: demoSetupInclude });
  if (!setup) throw createHttpError("Demo setup not found", 404);
  return setup;
}

async function createDemoSetup(input) {
  const data = validateInput(input);
  await validateRelations(data);
  return prisma.demoSetup.create({
    data: {
      name: data.name,
      academicSessionId: data.academicSessionId,
      tutorId: data.tutorId,
      gradeId: data.gradeId,
      stream: data.stream,
      mode: data.mode,
      demoStartDate: data.demoStartDate,
      demoEndDate: data.demoEndDate,
      availableDays: data.availableDays,
      status: data.status,
      boards: { create: data.boardIds.map((boardId) => ({ boardId })) },
      timeSlots: { create: data.timeSlots },
    },
    include: demoSetupInclude,
  });
}

async function updateDemoSetup(id, input) {
  const data = validateInput(input);
  await Promise.all([getDemoSetupById(id), validateRelations(data)]);
  try { return await prisma.$transaction(async (transaction) => {
    const existing = await transaction.demoSetup.findUnique({ where: { id }, include: { timeSlots: true } });
    if (!existing) throw createHttpError('Demo setup not found', 404);
    const bookings = await transaction.demoRequest.findMany({ where: { demoSetupId: id }, select: { demoSlotId: true, demoDate: true, boardId: true, status: true } });
    protectBookings(existing, data, bookings);
    const retainedIds = [];
    const newSlots = [];
    for (const slot of data.timeSlots) {
      const existingSlot = existing.timeSlots.find(s => s.startTime === slot.startTime && s.endTime === slot.endTime);
      if (existingSlot) {
        retainedIds.push(existingSlot.id);
        await transaction.demoSlot.update({ where: { id: existingSlot.id }, data: { capacity: slot.capacity } });
      } else newSlots.push(slot);
    }
    await transaction.demoSlot.deleteMany({ where: { demoSetupId: id, id: { notIn: retainedIds } } });
    await transaction.demoSetupBoard.deleteMany({ where: { demoSetupId: id } });
    return transaction.demoSetup.update({
      where: { id },
      data: {
        name: data.name,
        academicSessionId: data.academicSessionId,
        tutorId: data.tutorId,
        gradeId: data.gradeId,
        stream: data.stream,
        mode: data.mode,
        demoStartDate: data.demoStartDate,
        demoEndDate: data.demoEndDate,
        availableDays: data.availableDays,
        status: data.status,
        boards: { create: data.boardIds.map((boardId) => ({ boardId })) },
        timeSlots: { create: newSlots },
      },
      include: demoSetupInclude,
    });
  }, { isolationLevel: 'Serializable' }); } catch (error) {
    if (error.code === 'P2034') throw createHttpError('Bookings changed while saving. Refresh and try again.', 409);
    throw error;
  }
}

async function deleteDemoSetup(id) {
  await getDemoSetupById(id);
  return prisma.demoSetup.delete({ where: { id } });
}

module.exports = { listDemoSetups, listPublicDemoSetups, getDemoSetupById, createDemoSetup, updateDemoSetup, deleteDemoSetup };
