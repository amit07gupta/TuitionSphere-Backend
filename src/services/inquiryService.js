const prisma = require("../config/prisma");

const statuses = ["NEW", "CONTACTED", "FOLLOW_UP_REQUIRED", "READY_FOR_ADMISSION", "CLOSED"];
const transitions = {
  NEW: ["CONTACTED", "CLOSED"],
  CONTACTED: ["FOLLOW_UP_REQUIRED", "READY_FOR_ADMISSION", "CLOSED"],
  FOLLOW_UP_REQUIRED: ["CONTACTED", "READY_FOR_ADMISSION", "CLOSED"],
  READY_FOR_ADMISSION: ["CLOSED"],
  CLOSED: [],
};

function httpError(message, statusCode) { const error = new Error(message); error.statusCode = statusCode; return error; }

function validate(input = {}) {
  const data = {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").replace(/\D/g, "").slice(-10),
    email: String(input.email || "").trim().toLowerCase() || null,
    gradeId: String(input.gradeId || "").trim(),
    inquiryType: String(input.inquiryType || "").trim(),
    message: String(input.message || "").trim() || null,
    contactMethod: String(input.contactMethod || "").trim(),
    preferredTime: String(input.preferredTime || "").trim(),
    learningMode: String(input.learningMode || "flexible").trim(),
  };
  if (data.name.length < 2) throw httpError("Enter a valid name", 400);
  if (!/^[6-9]\d{9}$/.test(data.phone)) throw httpError("Enter a valid 10-digit Indian mobile number", 400);
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw httpError("Enter a valid email address", 400);
  if (!data.gradeId || !data.inquiryType || !data.contactMethod || !data.preferredTime) throw httpError("Complete all required inquiry fields", 400);
  return data;
}

async function createInquiry(input) {
  const data = validate(input);
  const grade = await prisma.grade.findUnique({ where: { id: data.gradeId } });
  if (!grade || grade.status !== "ACTIVE") throw httpError("Select an active grade", 400);
  const recent = await prisma.inquiry.findFirst({ where: { phone: data.phone, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent) throw httpError("Your inquiry has already been submitted", 409);
  return prisma.inquiry.create({ data, include: { grade: true } });
}

function listInquiries(query = {}) {
  const where = {};
  if (query.status && statuses.includes(String(query.status).toUpperCase())) where.status = String(query.status).toUpperCase();
  if (query.gradeId) where.gradeId = String(query.gradeId);
  if (query.search) {
    const search = String(query.search).trim();
    where.OR = ["name", "phone", "email", "message"].map((field) => ({ [field]: { contains: search, mode: "insensitive" } }));
  }
  return prisma.inquiry.findMany({ where, include: { grade: true }, orderBy: { createdAt: "desc" } });
}

async function getInquiry(id) {
  const record = await prisma.inquiry.findUnique({ where: { id }, include: { grade: true } });
  if (!record) throw httpError("Inquiry not found", 404);
  return record;
}

async function updateInquiry(id, input = {}) {
  const current = await getInquiry(id);
  const status = String(input.status || current.status).toUpperCase();
  if (!statuses.includes(status)) throw httpError("Invalid inquiry status", 400);
  if (status !== current.status && !transitions[current.status].includes(status)) throw httpError(`Inquiry cannot move from ${current.status} to ${status}`, 409);
  const followUpNote = String(input.followUpNote || "").trim() || current.followUpNote;
  if (status === "FOLLOW_UP_REQUIRED" && !followUpNote) throw httpError("Add a follow-up note", 400);
  return prisma.inquiry.update({ where: { id }, data: { status, followUpNote }, include: { grade: true } });
}

module.exports = { createInquiry, listInquiries, getInquiry, updateInquiry };
