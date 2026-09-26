const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../../config/prisma");

const invoiceInclude = {
  admission: {
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
      academicSession: true,
      grade: true,
      board: true,
      batch: true,
    },
  },
  feePlan: true,
  payments: { include: { receivedBy: { select: { id: true, name: true, email: true } } }, orderBy: { paymentDate: "desc" } },
  paymentReports: { select: { id: true, amount: true, paymentMode: true, paymentDate: true, transactionReference: true, proofName: true, note: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true }, orderBy: { createdAt: "desc" } },
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function money(value) {
  return new Prisma.Decimal(Number(value || 0).toFixed(2));
}

function startOfToday() {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

function createReference(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function dueDateForInstallment(startDate, dueDay, intervalMonths, index) {
  const start = new Date(startDate);
  const normalizedDueDay = Number(dueDay) || 1;
  const firstMonthOffset = normalizedDueDay < start.getUTCDate() ? intervalMonths : 0;
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + firstMonthOffset + (index * intervalMonths);
  year += Math.floor(month / 12);
  month %= 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(normalizedDueDay, lastDay)));
}

async function createInvoicesForAdmission(transaction, admissionId) {
  const admission = await transaction.admission.findUnique({
    where: { id: admissionId },
    include: { feePlan: true, academicSession: true },
  });
  if (!admission) throw httpError("Admission not found", 404);
  if (admission.status !== "ENROLLED") throw httpError("Invoices can only be generated for an enrolled admission", 409);
  if (admission.feePlan.status !== "ACTIVE") throw httpError("The selected fee plan is not active", 409);

  const existing = await transaction.invoice.count({ where: { admissionId } });
  if (existing) throw httpError("Invoices have already been generated for this admission", 409);

  const feePlan = admission.feePlan;
  const startDate = new Date(Math.max(admission.joiningDate.getTime(), feePlan.effectiveFrom.getTime()));
  const intervalMonths = feePlan.billingFrequency === "QUARTERLY" ? 3 : feePlan.billingFrequency === "FULL_SESSION" ? 12 : 1;
  const installmentCount = feePlan.billingFrequency === "FULL_SESSION" ? 1 : Math.max(1, feePlan.installments);
  const rows = [];

  if (Number(feePlan.admissionFee) > 0) {
    rows.push({
      invoiceNumber: createReference("INV"), admissionId, feePlanId: feePlan.id, installmentNumber: 0,
      title: "Admission Fee", amount: feePlan.admissionFee, totalAmount: feePlan.admissionFee,
      dueDate: startDate, status: startDate < startOfToday() ? "OVERDUE" : "PENDING",
    });
  }

  for (let index = 0; index < installmentCount; index += 1) {
    const dueDate = dueDateForInstallment(startDate, feePlan.dueDay, intervalMonths, index);
    const title = feePlan.billingFrequency === "FULL_SESSION"
      ? "Full Session Tuition Fee"
      : `${dueDate.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })} Tuition Fee`;
    rows.push({
      invoiceNumber: createReference("INV"), admissionId, feePlanId: feePlan.id, installmentNumber: index + 1,
      title, amount: feePlan.tuitionFee, totalAmount: feePlan.tuitionFee,
      dueDate, status: dueDate < startOfToday() ? "OVERDUE" : "PENDING",
    });
  }

  await transaction.invoice.createMany({ data: rows });
  return transaction.invoice.findMany({ where: { admissionId }, include: invoiceInclude, orderBy: { installmentNumber: "asc" } });
}

async function generateInvoices(admissionId) {
  const id = String(admissionId || "").trim();
  if (!id) throw httpError("Admission ID is required", 400);
  return prisma.$transaction((transaction) => createInvoicesForAdmission(transaction, id));
}

async function refreshOverdueInvoices() {
  await prisma.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: startOfToday() } },
    data: { status: "OVERDUE" },
  });
}

async function listInvoices(query = {}) {
  await refreshOverdueInvoices();
  const where = {};
  if (query.status) where.status = String(query.status).toUpperCase();
  if (query.admissionId) where.admissionId = String(query.admissionId);
  if (query.feePlanId) where.feePlanId = String(query.feePlanId);
  const admission = {};
  if (query.studentId) admission.studentId = String(query.studentId);
  if (query.academicSessionId) admission.academicSessionId = String(query.academicSessionId);
  if (query.gradeId) admission.gradeId = String(query.gradeId);
  if (query.boardId) admission.boardId = String(query.boardId);
  if (query.batchId) admission.batchId = String(query.batchId);
  if (Object.keys(admission).length) where.admission = admission;
  const search = String(query.search || "").trim();
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { admission: { student: { studentCode: { contains: search, mode: "insensitive" } } } },
      { admission: { student: { user: { name: { contains: search, mode: "insensitive" } } } } },
    ];
  }
  return prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] });
}

async function getInvoice(id) {
  await refreshOverdueInvoices();
  const invoice = await prisma.invoice.findFirst({ where: { OR: [{ id }, { invoiceNumber: id }] }, include: invoiceInclude });
  if (!invoice) throw httpError("Invoice not found", 404);
  return invoice;
}

async function recordPayment(invoiceId, input = {}, receivedById, db = prisma) {
  const amount = Number(input.amount);
  const paymentMode = String(input.paymentMode || "").trim().toUpperCase();
  const transactionReference = String(input.transactionReference || "").trim() || null;
  const notes = String(input.notes || "").trim() || null;
  const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
  if (!Number.isFinite(amount) || amount <= 0) throw httpError("Enter a valid payment amount", 400);
  if (!["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].includes(paymentMode)) throw httpError("Select a valid payment mode", 400);
  if (paymentMode !== "CASH" && !transactionReference) throw httpError("Transaction reference is required for non-cash payments", 400);
  if (Number.isNaN(paymentDate.getTime()) || paymentDate > new Date()) throw httpError("Payment date cannot be in the future", 400);

  return db.$transaction(async (transaction) => {
    const invoice = await transaction.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw httpError("Invoice not found", 404);
    if (["DRAFT", "CANCELLED", "PAID"].includes(invoice.status)) throw httpError(`Payment cannot be recorded for a ${invoice.status.toLowerCase()} invoice`, 409);
    if (transactionReference) {
      const duplicate = await transaction.payment.findFirst({ where: { transactionReference: { equals: transactionReference, mode: "insensitive" } } });
      if (duplicate) throw httpError("This transaction reference has already been used", 409);
    }
    const outstanding = new Prisma.Decimal(invoice.totalAmount).minus(invoice.paidAmount);
    if (money(amount).greaterThan(outstanding)) throw httpError(`Payment cannot exceed the outstanding amount of ${outstanding.toFixed(2)}`, 400);
    const nextPaidAmount = new Prisma.Decimal(invoice.paidAmount).plus(money(amount));
    const status = nextPaidAmount.greaterThanOrEqualTo(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";
    const updated = await transaction.invoice.updateMany({
      where: { id: invoiceId, status: invoice.status, paidAmount: invoice.paidAmount },
      data: { paidAmount: nextPaidAmount, status },
    });
    if (!updated.count) throw httpError('Invoice balance changed. Refresh and try again', 409);
    await transaction.payment.create({
      data: { receiptNumber: createReference("RCT"), invoiceId, amount: money(amount), paymentMode, transactionReference, paymentDate, notes, receivedById },
    });
    if (transactionReference) await transaction.studentPaymentReport.updateMany({
      where: { invoiceId, status: 'PENDING', transactionReference: { equals: transactionReference, mode: 'insensitive' }, amount: money(amount) },
      data: { status: 'APPROVED', reviewedById: receivedById, reviewedAt: new Date() },
    });
    return transaction.invoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
  });
}

module.exports = { createInvoicesForAdmission, generateInvoices, listInvoices, getInvoice, recordPayment };
