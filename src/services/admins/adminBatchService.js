const prisma = require("../../config/prisma");
const { buildBatchFilters } = require("./adminBatchFilterService");

const statuses = ["ACTIVE", "INACTIVE"];
const learningModes = ["ONLINE", "OFFLINE"];

const batchInclude = {
  academicSession: true,
  grade: true,
  board: true,
  subjects: {
    include: {
      subject: true,
      tutor: { include: { user: true } },
    },
  },
  _count: { select: { admissions: { where: { status: "ENROLLED" } } } },
};

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function uniqueAssignments(input) {
  const assignments = Array.isArray(input.subjectAssignments)
    ? input.subjectAssignments
    : Array.isArray(input.tutorAssignments)
      ? input.tutorAssignments
      : [];

  const normalized = assignments
    .map((item) => ({
      subjectId: String(item?.subjectId || "").trim(),
      tutorId: String(item?.tutorId || "").trim(),
    }))
    .filter((item) => item.subjectId && item.tutorId);

  if (new Set(normalized.map((item) => item.subjectId)).size !== normalized.length) {
    throw createHttpError("A subject can only be assigned once in a batch", 400);
  }

  return normalized;
}

function validateInput(input = {}) {
  const name = String(input.name || "").trim();
  const academicSessionId = String(input.academicSessionId || "").trim();
  const gradeId = String(input.gradeId || "").trim();
  const boardId = String(input.boardId || "").trim();
  const stream = String(input.stream || "").trim() || null;
  const learningMode = String(input.learningMode || input.mode || "OFFLINE").toUpperCase();
  const capacity = Number(input.capacity);
  const status = String(input.status || "ACTIVE").toUpperCase();
  const subjectAssignments = uniqueAssignments(input);

  if (!name) throw createHttpError("Batch name is required", 400);
  if (!academicSessionId) throw createHttpError("Academic session is required", 400);
  if (!gradeId) throw createHttpError("Grade is required", 400);
  if (!boardId) throw createHttpError("Board is required", 400);
  if (!learningModes.includes(learningMode)) throw createHttpError("Learning mode must be ONLINE or OFFLINE", 400);
  if (!Number.isInteger(capacity) || capacity < 1) throw createHttpError("Capacity must be a positive whole number", 400);
  if (!statuses.includes(status)) throw createHttpError("Batch status must be ACTIVE or INACTIVE", 400);
  if (!subjectAssignments.length) throw createHttpError("Assign at least one subject and tutor", 400);

  return { name, academicSessionId, gradeId, boardId, stream, learningMode, capacity, status, subjectAssignments };
}

async function validateRelations(data) {
  const [session, gradeBoard, subjects, tutors] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: data.academicSessionId }, select: { id: true } }),
    prisma.gradeBoard.findUnique({
      where: { gradeId_boardId: { gradeId: data.gradeId, boardId: data.boardId } },
      select: { id: true },
    }),
    prisma.subject.findMany({
      where: {
        id: { in: data.subjectAssignments.map((item) => item.subjectId) },
        boardId: data.boardId,
        status: "ACTIVE",
        grades: { some: { gradeId: data.gradeId } },
      },
      select: { id: true, streams: true },
    }),
    prisma.tutor.findMany({
      where: {
        id: { in: data.subjectAssignments.map((item) => item.tutorId) },
        status: "ACTIVE",
        boards: { some: { boardId: data.boardId } },
        grades: { some: { gradeId: data.gradeId } },
      },
      select: { id: true, modes: true, streams: true, subjects: { select: { subjectId: true } } },
    }),
  ]);

  if (!session) throw createHttpError("Academic session does not exist", 400);
  if (!gradeBoard) throw createHttpError("Selected board is not applicable to this grade", 400);
  if (subjects.length !== data.subjectAssignments.length) {
    throw createHttpError("One or more subjects are inactive or not applicable to the selected grade and board", 400);
  }

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const tutorById = new Map(tutors.map((tutor) => [tutor.id, tutor]));
  for (const assignment of data.subjectAssignments) {
    const subject = subjectById.get(assignment.subjectId);
    const tutor = tutorById.get(assignment.tutorId);
    if (!tutor || !tutor.subjects.some((item) => item.subjectId === assignment.subjectId)) {
      throw createHttpError("A selected tutor is not eligible for the assigned subject, grade, or board", 400);
    }
    if (tutor.modes.length && !tutor.modes.some((mode) => mode.toUpperCase() === data.learningMode)) {
      throw createHttpError("A selected tutor does not support the batch learning mode", 400);
    }
    if (data.stream && subject.streams.length && !subject.streams.includes(data.stream)) {
      throw createHttpError("A selected subject is not applicable to the batch stream", 400);
    }
    if (data.stream && tutor.streams.length && !tutor.streams.includes(data.stream)) {
      throw createHttpError("A selected tutor is not applicable to the batch stream", 400);
    }
  }
}

async function listBatches(query) {
  return prisma.batch.findMany({
    where: buildBatchFilters(query),
    include: batchInclude,
    orderBy: [{ grade: { numericValue: "asc" } }, { name: "asc" }],
  });
}

async function getBatchById(id) {
  const batch = await prisma.batch.findUnique({ where: { id }, include: batchInclude });
  if (!batch) throw createHttpError("Batch not found", 404);
  return batch;
}

async function createBatch(input) {
  const data = validateInput(input);
  await validateRelations(data);

  return prisma.batch.create({
    data: {
      name: data.name,
      academicSessionId: data.academicSessionId,
      gradeId: data.gradeId,
      boardId: data.boardId,
      stream: data.stream,
      learningMode: data.learningMode,
      capacity: data.capacity,
      status: data.status,
      subjects: { create: data.subjectAssignments },
    },
    include: batchInclude,
  });
}

async function updateBatch(id, input) {
  const data = validateInput(input);
  await Promise.all([getBatchById(id), validateRelations(data)]);

  return prisma.$transaction(async (transaction) => {
    await transaction.batchSubject.deleteMany({ where: { batchId: id } });
    return transaction.batch.update({
      where: { id },
      data: {
        name: data.name,
        academicSessionId: data.academicSessionId,
        gradeId: data.gradeId,
        boardId: data.boardId,
        stream: data.stream,
        learningMode: data.learningMode,
        capacity: data.capacity,
        status: data.status,
        subjects: { create: data.subjectAssignments },
      },
      include: batchInclude,
    });
  });
}

async function deleteBatch(id) {
  await getBatchById(id);
  return prisma.batch.delete({ where: { id } });
}

module.exports = { listBatches, getBatchById, createBatch, updateBatch, deleteBatch };
