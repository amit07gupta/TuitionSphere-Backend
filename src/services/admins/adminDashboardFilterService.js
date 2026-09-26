const { fail } = require('./attendanceRules');
function buildDashboardFilters(query = {}, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const month = query.month === undefined ? today.slice(0, 7) : query.month;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 2000 || Number(month.slice(0, 4)) > 9998) fail('Select a valid collection month');
  const id = query.academicSessionId;
  if (id !== undefined && (typeof id !== 'string' || !id.trim() || id.length > 100)) fail('Invalid academic session');
  const session = id && id !== 'all' ? { academicSessionId: id } : {};
  const start = new Date(`${month}-01T00:00:00+05:30`);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
  const end = new Date(`${next.toISOString().slice(0, 10)}T00:00:00+05:30`);
  return { today, month, session, start, end, days: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate() };
}
module.exports = { buildDashboardFilters };
