const prisma = require('../../config/prisma');
const { buildDashboardFilters } = require('./adminDashboardFilterService');
const { occurs, fail } = require('./attendanceRules');
const round = (value) => Math.round(value * 100) / 100;
function summarizeAttendance(schedules, admissions, records, date, now) {
  const marked = new Set(records.map((row) => `${row.classScheduleId}:${row.studentId}`));
  return schedules.filter((row) => new Date(`${date}T${row.endTime}:00+05:30`) <= now && admissions.some((admission) => admission.batchId === row.batchId && admission.academicSessionId === row.academicSessionId && !marked.has(`${row.id}:${admission.studentId}`))).length;
}
async function overview(query = {}, now = new Date()) {
  const f = buildDashboardFilters(query, now);
  return prisma.$transaction(async (tx) => {
    if (f.session.academicSessionId && !await tx.academicSession.findUnique({ where: { id: f.session.academicSessionId }, select: { id: true } })) fail('Academic session not found', 404);
    const date = new Date(`${f.today}T00:00:00Z`);
    const invoiceWhere = { status: { notIn: ['DRAFT', 'CANCELLED'] }, admission: f.session };
    const [sessions, students, batches, pendingInquiries, inquiries, demos, enrolled, invoices, payments, schedules, admissions, records, leaves] = await Promise.all([
      tx.academicSession.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' } }),
      tx.student.count({ where: f.session.academicSessionId ? { admissions: { some: f.session } } : {} }),
      tx.batch.count({ where: { ...f.session, status: 'ACTIVE' } }),
      tx.inquiry.count({ where: { status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP_REQUIRED'] } } }),
      tx.inquiry.count(), tx.demoRequest.count(), tx.admission.count({ where: { status: 'ENROLLED' } }),
      tx.invoice.findMany({ where: invoiceWhere, select: { totalAmount: true, paidAmount: true, dueDate: true } }),
      tx.payment.findMany({ where: { invoice: invoiceWhere, paymentDate: { gte: f.start, lt: f.end } }, select: { amount: true, paymentDate: true } }),
      tx.classSchedule.findMany({ where: { ...f.session, status: 'SCHEDULED', startDate: { lte: date }, endDate: { gte: date } }, include: { subject: { select: { name: true } }, batch: { select: { name: true } }, tutor: { select: { user: { select: { name: true } } } } }, orderBy: { startTime: 'asc' } }),
      tx.admission.findMany({ where: { ...f.session, status: 'ENROLLED', joiningDate: { lte: date }, student: { user: { status: 'ACTIVE' } } }, select: { studentId: true, batchId: true, academicSessionId: true } }),
      tx.attendance.findMany({ where: { date, classSchedule: f.session }, select: { studentId: true, classScheduleId: true } }),
      tx.leaveRequest.count({ where: { status: 'PENDING', batch: f.session } }),
    ]);
    const todayClasses = schedules.filter((row) => occurs(row, date));
    const daily = Array(f.days).fill(0);
    for (const payment of payments) {
      const day = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit' }).format(payment.paymentDate));
      daily[day - 1] += Number(payment.amount);
    }
    let outstanding = 0; let overdueAmount = 0; let overdueCount = 0;
    for (const invoice of invoices) {
      const balance = Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount));
      outstanding += balance;
      if (invoice.dueDate < date && balance > 0) { overdueAmount += balance; overdueCount++; }
    }
    return { today: f.today, month: f.month, sessions, students, batches, pendingInquiries,
      admissions: { inquiries, demos, enrolled },
      collection: { total: round(daily.reduce((a, b) => a + b, 0)), daily: daily.map(round), paymentCount: payments.length, outstanding: round(outstanding), overdueAmount: round(overdueAmount), overdueCount },
      schedule: { total: todayClasses.length, classes: todayClasses.slice(0, 4).map((row) => ({ id: row.id, startTime: row.startTime, endTime: row.endTime, subject: row.subject.name, batchName: row.batch.name, mentor: row.tutor?.user?.name || '', mode: row.learningMode === 'ONLINE' ? 'Online' : 'Offline' })) },
      attention: { pendingLeaves: leaves, pendingAttendance: summarizeAttendance(todayClasses, admissions, records, f.today, now) },
    };
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
}
module.exports = { overview, summarizeAttendance };
