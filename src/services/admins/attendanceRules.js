const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Enter a valid date');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('Enter a valid date');
  return date;
}
const key = (date) => new Date(date).toISOString().slice(0, 10);
function occurs(schedule, date) {
  const day = key(date);
  return schedule.status === 'SCHEDULED' && day >= key(schedule.startDate) && day <= key(schedule.endDate)
    && (schedule.scheduleType === 'SINGLE' ? day === key(schedule.startDate) : schedule.repeatDays.includes(weekdays[new Date(date).getUTCDay()]));
}
function sessionsBetween(schedules, from, to) {
  const start = parseDate(key(from)); const end = parseDate(key(to));
  if (end < start || end - start > 366 * 86400000) fail('Leave period must be within one year');
  const rows = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    for (const schedule of schedules) if (occurs(schedule, date)) rows.push({ classId: schedule.id, date: key(date), subject: schedule.subject.name, topic: schedule.topic || '', startTime: schedule.startTime, endTime: schedule.endTime });
  }
  return rows;
}
function started(schedule, date, now = new Date()) {
  // TuitionSphere class times are in India Standard Time.
  return new Date(`${key(date)}T${schedule.startTime}:00+05:30`) <= now;
}
module.exports = { fail, parseDate, key, occurs, sessionsBetween, started };
