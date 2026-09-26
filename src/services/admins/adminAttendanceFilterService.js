const { parseDate, fail } = require('./attendanceRules');
function buildAttendanceFilters(query = {}) {
  const records = {}; const leaves = {};
  if (query.batchId) { records.classSchedule = { batchId: String(query.batchId) }; leaves.batchId = String(query.batchId); }
  if (query.studentId) { records.studentId = String(query.studentId); leaves.studentId = String(query.studentId); }
  if (query.date) records.date = parseDate(query.date);
  if (query.status) {
    const status = String(query.status).toUpperCase();
    if (!['PRESENT', 'ABSENT', 'LEAVE'].includes(status)) fail('Invalid attendance status');
    records.status = status;
  }
  if (query.leaveStatus) {
    const status = String(query.leaveStatus).toUpperCase();
    if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) fail('Invalid leave status');
    leaves.status = status;
  }
  if (query.month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(query.month))) fail('Invalid leave month');
    const start = parseDate(`${query.month}-01`); const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    leaves.fromDate = { lt: end }; leaves.toDate = { gte: start };
  }
  return { records, leaves };
}
module.exports = { buildAttendanceFilters };
