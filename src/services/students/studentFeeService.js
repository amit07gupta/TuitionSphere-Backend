const crypto = require('node:crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/prisma');

const proofTypes = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const modes = new Set(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CARD']);
const reportSelect = {
  id: true, invoiceId: true, amount: true, paymentMode: true, paymentDate: true,
  transactionReference: true, proofName: true, note: true, status: true,
  reviewNote: true, reviewedAt: true, createdAt: true,
};
const paymentSelect = {
  id: true, receiptNumber: true, amount: true, paymentMode: true,
  paymentDate: true, transactionReference: true, notes: true,
};
const invoiceSelect = {
  id: true, invoiceNumber: true, title: true, totalAmount: true, paidAmount: true,
  dueDate: true, status: true, admission: {
    select: { studentId: true, batch: { select: { name: true } },
      grade: { select: { gradeName: true } }, board: { select: { code: true } },
      academicSession: { select: { name: true } } },
  },
  payments: { select: paymentSelect, orderBy: { paymentDate: 'desc' } },
  paymentReports: { select: reportSelect, orderBy: { createdAt: 'desc' } },
};

function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function dateKey(value) { return value?.toISOString().slice(0, 10) || ''; }
function normalizeReport(row) {
  return { ...row, amount: Number(row.amount), paymentDate: dateKey(row.paymentDate) };
}
function normalizeInvoice(row) {
  const amount = Number(row.totalAmount);
  const paidAmount = Number(row.paidAmount);
  return {
    id: row.id, invoiceNumber: row.invoiceNumber, installment: row.title,
    amount, paidAmount, outstandingAmount: Math.max(0, Number(new Prisma.Decimal(row.totalAmount).minus(row.paidAmount))),
    dueDate: dateKey(row.dueDate),
    status: row.status === 'PENDING' && dateKey(row.dueDate) < new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) ? 'OVERDUE' : row.status,
    program: `${row.admission.grade.gradeName} · ${row.admission.board.code}`,
    batchName: row.admission.batch.name,
    academicSession: row.admission.academicSession.name,
    payments: row.payments.map((payment) => ({ ...payment, amount: Number(payment.amount), paymentDate: dateKey(payment.paymentDate) })),
    reports: row.paymentReports.map(normalizeReport),
  };
}

async function studentFor(userId, db) {
  const student = await db.student.findUnique({ where: { userId }, select: { id: true, studentCode: true, user: { select: { name: true } } } });
  if (!student) fail('Student profile not found', 404);
  return student;
}

async function list(userId, db = prisma) {
  const student = await studentFor(userId, db);
  const invoices = await db.invoice.findMany({
    where: { admission: { studentId: student.id } },
    select: invoiceSelect,
    orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
  });
  return { student: { id: student.id, studentCode: student.studentCode, name: student.user.name },
    invoices: invoices.map(normalizeInvoice) };
}

function parseReport(input) {
  const allowed = ['amount', 'paymentMode', 'paymentDate', 'transactionReference', 'proofName', 'proofData', 'note'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key))) fail('Invalid payment report');
  const amount = Number(input.amount);
  if (!/^\d+(\.\d{1,2})?$/.test(String(input.amount)) || !Number.isFinite(amount) || amount <= 0) fail('Enter a valid payment amount');
  const paymentMode = String(input.paymentMode || '').trim().toUpperCase();
  if (!modes.has(paymentMode)) fail('Select a valid payment method');
  const paymentDate = String(input.paymentDate || '');
  const parsedDate = new Date(`${paymentDate}T00:00:00.000Z`);
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(parsedDate.getTime()) || dateKey(parsedDate) !== paymentDate || paymentDate > today) fail('Select a valid payment date');
  const transactionReference = String(input.transactionReference || '').trim();
  if (transactionReference.length < 3 || transactionReference.length > 100) fail('Transaction reference must contain 3 to 100 characters');
  const proofName = String(input.proofName || '').trim();
  const extension = proofName.toLowerCase().split('.').pop();
  const mime = proofTypes[extension];
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(input.proofData || ''));
  if (!mime || proofName.length > 255 || !match || match[1] !== mime) fail('Upload a PDF, JPG or PNG payment proof');
  const proofData = Buffer.from(match[2], 'base64');
  if (!proofData.length || proofData.length > 2 * 1024 * 1024 || proofData.toString('base64') !== match[2]) fail('Payment proof must be 2 MB or smaller');
  const validSignature = extension === 'pdf' ? proofData.subarray(0, 5).toString() === '%PDF-'
    : extension === 'png' ? proofData.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : proofData.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (!validSignature) fail('Payment proof content does not match its file type');
  const note = String(input.note || '').trim();
  if (note.length > 250) fail('Note must be 250 characters or fewer');
  return { amount: new Prisma.Decimal(amount.toFixed(2)), paymentMode, paymentDate: parsedDate,
    transactionReference, proofName, proofData, note: note || null };
}

async function submit(userId, invoiceId, input, db = prisma) {
  const student = await studentFor(userId, db);
  const data = parseReport(input);
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, admission: { studentId: student.id } },
    select: { id: true, status: true, totalAmount: true, paidAmount: true },
  });
  if (!invoice) fail('Invoice not found', 404);
  if (!['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(invoice.status)) fail('This invoice cannot receive a payment report', 409);
  if (data.amount.greaterThan(new Prisma.Decimal(invoice.totalAmount).minus(invoice.paidAmount))) fail('Reported amount exceeds the outstanding balance');
  const previous = await db.studentPaymentReport.findFirst({ where: { invoiceId, status: 'PENDING' }, select: { id: true } });
  if (previous) fail('A payment report is already awaiting verification', 409);
  try {
    const report = await db.studentPaymentReport.create({ data: { invoiceId, studentId: student.id, ...data }, select: reportSelect });
    return normalizeReport(report);
  } catch (error) {
    if (error.code === 'P2002') fail('A payment report is already awaiting verification', 409);
    throw error;
  }
}

async function proof(reportId, db = prisma) {
  const report = await db.studentPaymentReport.findUnique({ where: { id: reportId }, select: { proofName: true, proofData: true } });
  if (!report) fail('Payment report not found', 404);
  const mime = proofTypes[report.proofName.toLowerCase().split('.').pop()];
  return { fileName: report.proofName, fileData: `data:${mime};base64,${Buffer.from(report.proofData).toString('base64')}` };
}

async function review(reportId, reviewerId, input, db = prisma) {
  const decision = String(input?.decision || '').toUpperCase();
  const reviewNote = String(input?.reviewNote || '').trim();
  if (!['APPROVED', 'REJECTED'].includes(decision) || Object.keys(input || {}).some((key) => !['decision', 'reviewNote'].includes(key))) fail('Select a valid review decision');
  if (reviewNote.length > 500 || (decision === 'REJECTED' && reviewNote.length < 5)) fail('Enter a review reason of 5 to 500 characters');
  return db.$transaction(async (tx) => {
    const report = await tx.studentPaymentReport.findUnique({ where: { id: reportId }, include: { invoice: true } });
    if (!report) fail('Payment report not found', 404);
    if (report.status !== 'PENDING') fail('Payment report has already been reviewed', 409);
    const updated = await tx.studentPaymentReport.updateMany({ where: { id: reportId, status: 'PENDING' }, data: {
      status: decision, reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote || null,
    } });
    if (!updated.count) fail('Payment report has already been reviewed', 409);
    if (decision === 'REJECTED') return { invoiceId: report.invoiceId, status: decision };
    const invoice = report.invoice;
    const nextPaid = new Prisma.Decimal(invoice.paidAmount).plus(report.amount);
    if (!['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(invoice.status) || nextPaid.greaterThan(invoice.totalAmount)) fail('Invoice balance changed; review the report again', 409);
    const duplicate = await tx.payment.findFirst({ where: { transactionReference: { equals: report.transactionReference, mode: 'insensitive' } }, select: { id: true } });
    if (duplicate) fail('Transaction reference has already been recorded', 409);
    const invoiceUpdate = await tx.invoice.updateMany({
      where: { id: invoice.id, status: invoice.status, paidAmount: invoice.paidAmount },
      data: { paidAmount: nextPaid, status: nextPaid.greaterThanOrEqualTo(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID' },
    });
    if (!invoiceUpdate.count) fail('Invoice balance changed; review the report again', 409);
    await tx.payment.create({ data: {
      receiptNumber: `RCT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`,
      invoiceId: invoice.id, amount: report.amount, paymentMode: report.paymentMode,
      transactionReference: report.transactionReference, paymentDate: report.paymentDate,
      notes: report.note, receivedById: reviewerId,
    } });
    return { invoiceId: invoice.id, status: decision };
  });
}

module.exports = { list, submit, proof, review, parseReport, normalizeInvoice };
