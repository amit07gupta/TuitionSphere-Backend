const prisma = require("../../config/prisma");

const statuses = ["NEW", "CONTACTED", "CONFIRMED", "ADMISSION_STARTED", "ENROLLED", "CANCELLED"];
const transitions = {
  NEW: ["CONTACTED", "CANCELLED"],
  CONTACTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ADMISSION_STARTED", "CANCELLED"],
  ADMISSION_STARTED: ["ENROLLED"],
  ENROLLED: [],
  CANCELLED: [],
};

const include = {
  demoSetup: { include: { tutor: { include: { user: { select: { id: true, name: true } } } } } },
  demoSlot: true,
  grade: true,
  board: true,
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function filters(query = {}) {
  const where = {};
  if (query.status && statuses.includes(String(query.status).toUpperCase())) where.status = String(query.status).toUpperCase();
  if (query.demoSetupId) where.demoSetupId = String(query.demoSetupId);
  if (query.tutorId) where.demoSetup = { tutorId: String(query.tutorId) };
  if (query.gradeId) where.gradeId = String(query.gradeId);
  if (query.boardId) where.boardId = String(query.boardId);
  if (query.search) {
    const search = String(query.search).trim();
    where.OR = ["studentName", "parentName", "email", "phone"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } }));
  }
  return where;
}

function listDemoRequests(query) {
  return prisma.demoRequest.findMany({
    where: filters(query),
    include,
    orderBy: { createdAt: "desc" },
  });
}

async function getDemoRequest(id) {
  const request = await prisma.demoRequest.findUnique({ where: { id }, include });
  if (!request) throw httpError("Demo request not found", 404);
  return request;
}

async function updateStatus(id, value) {
  const status = String(value || "").toUpperCase();
  if (!statuses.includes(status)) throw httpError("Invalid demo request status", 400);
  const current = await getDemoRequest(id);
  if (current.status === status) return current;
  if (!transitions[current.status].includes(status)) {
    throw httpError(`Demo request cannot move from ${current.status} to ${status}`, 409);
  }
  return prisma.demoRequest.update({ where: { id }, data: { status }, include });
}

module.exports = { listDemoRequests, getDemoRequest, updateStatus };
