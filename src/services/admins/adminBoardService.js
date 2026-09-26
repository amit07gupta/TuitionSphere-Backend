const prisma = require("../../config/prisma");

const statuses = ["ACTIVE", "INACTIVE"];

function validateInput(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : null;
  const status = String(input.status || "ACTIVE").toUpperCase();

  if (!name) {
    const error = new Error("Board name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!code) {
    const error = new Error("Board code is required");
    error.statusCode = 400;
    throw error;
  }

  if (!statuses.includes(status)) {
    const error = new Error("Board status must be ACTIVE or INACTIVE");
    error.statusCode = 400;
    throw error;
  }

  return { name, code, description, status };
}

function list() {
  return prisma.board.findMany({
    orderBy: { name: "asc" },
  });
}

async function create(input) {
  const data = validateInput(input);
  return prisma.board.create({ data });
}

async function getById(id) {
  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          grades: true,
          subjects: true,
          tutors: true,
        },
      },
    },
  });

  if (!board) {
    const error = new Error("Board not found");
    error.statusCode = 404;
    throw error;
  }

  return board;
}

async function update(id, input) {
  await getById(id);
  const data = validateInput(input);
  return prisma.board.update({ where: { id }, data });
}

async function remove(id) {
  const board = await getById(id);
  const linkedRecords = board._count.grades + board._count.subjects + board._count.tutors;

  if (linkedRecords > 0) {
    const error = new Error("Board cannot be deleted while it is assigned to grades, subjects or tutors");
    error.statusCode = 409;
    throw error;
  }

  return prisma.board.delete({ where: { id } });
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
};
