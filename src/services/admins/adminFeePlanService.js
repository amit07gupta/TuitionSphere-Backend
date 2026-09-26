const prisma = require("../../config/prisma");
const { buildFeePlanFilters } = require("./adminFeePlanFilterService");

const statuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
const frequencies = ["MONTHLY", "QUARTERLY", "FULL_SESSION"];
const installmentCounts = { MONTHLY: 12, QUARTERLY: 4, FULL_SESSION: 1 };

const feePlanInclude = { academicSession: true, grade: true };

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

function parseMoney(value, label, allowZero = true) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) {
    throw createHttpError(`${label} must be ${allowZero ? "zero or greater" : "greater than zero"}`, 400);
  }
  return amount.toFixed(2);
}

function validateInput(input = {}) {
  const name = String(input.name || "").trim();
  const academicSessionId = String(input.academicSessionId || "").trim();
  const gradeId = String(input.gradeId || "").trim();
  const admissionFee = parseMoney(input.admissionFee, "Admission fee");
  const tuitionFee = parseMoney(input.tuitionFee, "Tuition fee", false);
  const billingFrequency = String(input.billingFrequency || "").trim().toUpperCase().replaceAll(" ", "_");
  const dueDay = Number(input.dueDay);
  const lateFee = parseMoney(input.lateFee ?? 0, "Late fee");
  const gracePeriodDays = Number(input.gracePeriodDays ?? 0);
  const effectiveFrom = parseDate(input.effectiveFrom, "Effective from");
  const effectiveTo = parseDate(input.effectiveTo, "Effective to");
  const status = String(input.status || "DRAFT").trim().toUpperCase();

  if (!name) throw createHttpError("Fee plan name is required", 400);
  if (!academicSessionId) throw createHttpError("Academic session is required", 400);
  if (!gradeId) throw createHttpError("Grade is required", 400);
  if (!frequencies.includes(billingFrequency)) throw createHttpError("Invalid billing frequency", 400);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw createHttpError("Due day must be between 1 and 28", 400);
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0) throw createHttpError("Grace period must be zero or greater", 400);
  if (effectiveTo < effectiveFrom) throw createHttpError("Effective end date must be on or after the start date", 400);
  if (!statuses.includes(status)) throw createHttpError("Invalid fee plan status", 400);

  return {
    name,
    academicSessionId,
    gradeId,
    admissionFee,
    tuitionFee,
    billingFrequency,
    installments: installmentCounts[billingFrequency],
    dueDay,
    lateFee,
    gracePeriodDays,
    effectiveFrom,
    effectiveTo,
    status,
  };
}

async function validateRelations(data) {
  const [session, grade] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: data.academicSessionId } }),
    prisma.grade.findUnique({ where: { id: data.gradeId } }),
  ]);

  if (!session) throw createHttpError("Academic session does not exist", 400);
  if (!grade) throw createHttpError("Grade does not exist", 400);
  if (data.effectiveFrom < session.startDate || data.effectiveTo > session.endDate) {
    throw createHttpError("Effective dates must remain within the academic session", 400);
  }
}

function listFeePlans(query) {
  return prisma.feePlan.findMany({
    where: buildFeePlanFilters(query),
    include: feePlanInclude,
    orderBy: [{ grade: { numericValue: "asc" } }, { createdAt: "desc" }],
  });
}

async function getFeePlanById(id) {
  const plan = await prisma.feePlan.findUnique({ where: { id }, include: feePlanInclude });
  if (!plan) throw createHttpError("Fee plan not found", 404);
  return plan;
}

async function createFeePlan(input) {
  const data = validateInput(input);
  await validateRelations(data);
  return prisma.feePlan.create({ data, include: feePlanInclude });
}

async function updateFeePlan(id, input) {
  const data = validateInput(input);
  await Promise.all([getFeePlanById(id), validateRelations(data)]);
  return prisma.feePlan.update({ where: { id }, data, include: feePlanInclude });
}

async function deleteFeePlan(id) {
  await getFeePlanById(id);
  return prisma.feePlan.delete({ where: { id } });
}

module.exports = { listFeePlans, getFeePlanById, createFeePlan, updateFeePlan, deleteFeePlan };
