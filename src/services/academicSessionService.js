const prisma = require("../config/prisma");

const statuses = ["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"];

function parseDate(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return date;
}

function validateInput(input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const status = String(input.status || "UPCOMING").toUpperCase();
  const startDate = parseDate(input.startDate, "Start date");
  const endDate = parseDate(input.endDate, "End date");

  if (!name) {
    const error = new Error("Academic session name is required");
    error.statusCode = 400;
    throw error;
  }
  if (!statuses.includes(status)) {
    const error = new Error("Invalid academic session status");
    error.statusCode = 400;
    throw error;
  }
  if (endDate <= startDate) {
    const error = new Error("End date must be after the session start date");
    error.statusCode = 400;
    throw error;
  }

  return { name, status, startDate, endDate };
}

function list() {
  return prisma.academicSession.findMany({
    orderBy: { startDate: "desc" },
  });
}

function findById(id) {
  return prisma.academicSession.findUnique({ where: { id } });
}

async function create(input) {
  const data = validateInput(input);

  return prisma.$transaction(async (transaction) => {
    if (data.status === "ACTIVE") {
      await transaction.academicSession.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "COMPLETED" },
      });
    }
    return transaction.academicSession.create({ data });
  });
}

async function update(id, input) {
  const data = validateInput(input);

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.academicSession.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error("Academic session not found");
      error.statusCode = 404;
      throw error;
    }
    if (data.status === "ACTIVE") {
      await transaction.academicSession.updateMany({
        where: { status: "ACTIVE", id: { not: id } },
        data: { status: "COMPLETED" },
      });
    }
    return transaction.academicSession.update({ where: { id }, data });
  });
}

async function setStatus(id, status) {
  if (!statuses.includes(status)) {
    const error = new Error("Invalid academic session status");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.academicSession.findUnique({ where: { id } });
    if (!existing) {
      const error = new Error("Academic session not found");
      error.statusCode = 404;
      throw error;
    }
    if (status === "ACTIVE") {
      await transaction.academicSession.updateMany({
        where: { status: "ACTIVE", id: { not: id } },
        data: { status: "COMPLETED" },
      });
    }
    return transaction.academicSession.update({
      where: { id },
      data: { status },
    });
  });
}

module.exports = { list, findById, create, update, setStatus };
