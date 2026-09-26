"use strict";

const prisma = require("../../config/prisma");

const statuses = ["ACTIVE", "INACTIVE"];
const allowedStreams = ["Science", "Commerce"];

const subjectInclude = {
  board: true,
  grades: {
    include: {
      grade: true,
    },
  },
};

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateInput(input = {}) {
  const name = String(input.name || "").trim();
  const code = String(input.code || "").trim().toUpperCase();
  const boardId = String(input.boardId || "").trim();
  const gradeIds = [...new Set(Array.isArray(input.gradeIds) ? input.gradeIds.filter(Boolean) : [])];
  const streams = [...new Set(Array.isArray(input.streams) ? input.streams.filter(Boolean) : [])];
  const status = String(input.status || "ACTIVE").toUpperCase();

  if (name.length < 2) throw createHttpError("Enter a valid subject name", 400);
  if (!code) throw createHttpError("Subject code is required", 400);
  if (!boardId) throw createHttpError("Board is required", 400);
  if (!gradeIds.length) throw createHttpError("Select at least one grade", 400);
  if (!statuses.includes(status)) throw createHttpError("Subject status must be ACTIVE or INACTIVE", 400);
  if (streams.some((stream) => !allowedStreams.includes(stream))) {
    throw createHttpError("Streams can only contain Science or Commerce", 400);
  }

  return { name, code, boardId, gradeIds, streams, status };
}

async function validateRelations({ boardId, gradeIds, streams }) {
  const [board, grades] = await Promise.all([
    prisma.board.findUnique({ where: { id: boardId }, select: { id: true } }),
    prisma.grade.findMany({
      where: { id: { in: gradeIds } },
      select: { id: true, numericValue: true },
    }),
  ]);

  if (!board) throw createHttpError("Selected board does not exist", 400);
  if (grades.length !== gradeIds.length) throw createHttpError("One or more selected grades do not exist", 400);
  if (streams.length && !grades.some((grade) => grade.numericValue >= 11)) {
    throw createHttpError("Streams are only applicable to Grade 11 and Grade 12", 400);
  }
}

function listSubjects(filters = {}) {
  const where = {};
  if (filters.boardId) where.boardId = filters.boardId;
  if (filters.status) where.status = String(filters.status).toUpperCase();
  if (filters.gradeId) where.grades = { some: { gradeId: filters.gradeId } };
  if (filters.stream) where.streams = { has: filters.stream };

  return prisma.subject.findMany({
    where,
    include: subjectInclude,
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}

async function getSubjectById(id) {
  const subject = await prisma.subject.findUnique({ where: { id }, include: subjectInclude });
  if (!subject) throw createHttpError("Subject not found", 404);
  return subject;
}

async function createSubject(input) {
  const data = validateInput(input);
  await validateRelations(data);

  return prisma.subject.create({
    data: {
      name: data.name,
      code: data.code,
      boardId: data.boardId,
      streams: data.streams,
      status: data.status,
      grades: {
        create: data.gradeIds.map((gradeId) => ({ gradeId })),
      },
    },
    include: subjectInclude,
  });
}

async function updateSubject(id, input) {
  const data = validateInput(input);
  await Promise.all([getSubjectById(id), validateRelations(data)]);

  return prisma.$transaction(async (transaction) => {
    await transaction.subjectGrade.deleteMany({ where: { subjectId: id } });
    return transaction.subject.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        boardId: data.boardId,
        streams: data.streams,
        status: data.status,
        grades: {
          create: data.gradeIds.map((gradeId) => ({ gradeId })),
        },
      },
      include: subjectInclude,
    });
  });
}

async function deleteSubject(id) {
  await getSubjectById(id);
  return prisma.subject.delete({ where: { id } });
}

module.exports = {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
