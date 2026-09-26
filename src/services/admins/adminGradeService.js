const prisma = require("../../config/prisma");

const statuses = ["ACTIVE", "INACTIVE"];

const gradeInclude = {
  boards: {
    include: {
      board: true,
    },
  },
};

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateInput(input = {}) {
  const gradeName = String(input.gradeName || "").trim();
  const numericValue = Number(input.numericValue);
  const learningStage = String(input.learningStage || "").trim();
  const status = String(input.status || "ACTIVE").toUpperCase();
  const boardIds = [...new Set(Array.isArray(input.boardIds) ? input.boardIds.filter(Boolean) : [])];

  if (!gradeName) throw createHttpError("Grade name is required", 400);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 12) {
    throw createHttpError("Numeric value must be an integer between 1 and 12", 400);
  }
  const gradeNumberInName = /^(?:grade|class)\s+(\d+)$/i.exec(gradeName);
  if (gradeNumberInName && Number(gradeNumberInName[1]) !== numericValue) {
    throw createHttpError("Grade name and numeric value must match", 400);
  }
  if (!learningStage) throw createHttpError("Learning stage is required", 400);
  if (!statuses.includes(status)) throw createHttpError("Grade status must be ACTIVE or INACTIVE", 400);
  if (!boardIds.length) throw createHttpError("Select at least one board", 400);

  return { gradeName, numericValue, learningStage, status, boardIds };
}

async function validateBoards(boardIds) {
  const boards = await prisma.board.findMany({
    where: { id: { in: boardIds } },
    select: { id: true },
  });

  if (boards.length !== boardIds.length) {
    throw createHttpError("One or more selected boards do not exist", 400);
  }
}

async function listGrades() {
  return prisma.grade.findMany({
    include: gradeInclude,
    orderBy: {
      numericValue: "asc",
    },
  });
}

async function createGrade(input) {
  const data = validateInput(input);
  await validateBoards(data.boardIds);

  return prisma.grade.create({
    data: {
      gradeName: data.gradeName,
      numericValue: data.numericValue,
      learningStage: data.learningStage,
      status: data.status,
      boards: {
        create: data.boardIds.map((boardId) => ({ boardId })),
      },
    },
    include: gradeInclude,
  });
}

async function getGradeById(id) {
  const grade = await prisma.grade.findUnique({ where: { id }, include: gradeInclude });
  if (!grade) throw createHttpError("Grade not found", 404);
  return grade;
}

async function updateGrade(id, input) {
  const data = validateInput(input);
  await Promise.all([getGradeById(id), validateBoards(data.boardIds)]);

  return prisma.$transaction(async (transaction) => {
    await transaction.gradeBoard.deleteMany({ where: { gradeId: id } });
    return transaction.grade.update({
      where: { id },
      data: {
        gradeName: data.gradeName,
        numericValue: data.numericValue,
        learningStage: data.learningStage,
        status: data.status,
        boards: {
          create: data.boardIds.map((boardId) => ({ boardId })),
        },
      },
      include: gradeInclude,
    });
  });
}

async function deleteGrade(id) {
  await getGradeById(id);
  return prisma.grade.delete({ where: { id } });
}

module.exports = {
  listGrades,
  createGrade,
  getGradeById,
  updateGrade,
  deleteGrade,
};
