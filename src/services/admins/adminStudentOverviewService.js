const prisma = require('../../config/prisma');
const { fail } = require('./attendanceRules');
function summarize(records, invoices) {
  const counts = { present: 0, absent: 0, leave: 0 };
  for (const row of records) counts[row.status.toLowerCase()]++;
  const denominator = counts.present + counts.absent;
  const fees = { invoiced: 0, paid: 0, outstanding: 0 };
  for (const row of invoices.filter((item) => !['DRAFT', 'CANCELLED'].includes(item.status))) {
    fees.invoiced += Number(row.totalAmount);
    fees.paid += Number(row.paidAmount);
    fees.outstanding += Math.max(0, Number(row.totalAmount) - Number(row.paidAmount));
  }
  return { attendance: { ...counts, total: records.length, percentage: denominator ? Math.round(counts.present / denominator * 1000) / 10 : null }, fees: Object.fromEntries(Object.entries(fees).map(([key, value]) => [key, Math.round(value * 100) / 100])) };
}
async function overview(studentId) {
  return prisma.$transaction(async (tx) => {
    if (!await tx.student.findUnique({ where: { id: studentId }, select: { id: true } })) fail('Student not found', 404);
    const [attendance, invoices] = await Promise.all([
      tx.attendance.findMany({ where: { studentId }, select: { id: true, date: true, status: true, classSchedule: { select: { subject: { select: { name: true } }, batch: { select: { name: true } }, startTime: true } } }, orderBy: [{ date: 'desc' }, { id: 'asc' }] }),
      tx.invoice.findMany({ where: { admission: { studentId } }, select: { id: true, invoiceNumber: true, title: true, dueDate: true, status: true, totalAmount: true, paidAmount: true, payments: { select: { id: true, receiptNumber: true, paymentDate: true, paymentMode: true, amount: true, transactionReference: true }, orderBy: { paymentDate: 'desc' } } }, orderBy: { dueDate: 'desc' } }),
    ]);
    return { ...summarize(attendance, invoices), attendanceHistory: attendance, invoices: invoices.map((row) => ({ ...row, totalAmount: Number(row.totalAmount), paidAmount: Number(row.paidAmount), outstandingAmount: ['DRAFT', 'CANCELLED'].includes(row.status) ? 0 : Math.max(0, Number(row.totalAmount) - Number(row.paidAmount)), payments: row.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })) })) };
  }, { isolationLevel: 'RepeatableRead' });
}
module.exports = { overview, summarize };
