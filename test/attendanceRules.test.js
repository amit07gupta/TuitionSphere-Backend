const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDate, occurs, sessionsBetween, started } = require('../src/services/admins/attendanceRules');
const schedule = { id: 'class1', status: 'SCHEDULED', scheduleType: 'RECURRING', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30'), repeatDays: ['WEDNESDAY'], startTime: '10:00', endTime: '11:00', subject: { name: 'Math' } };
test('rejects impossible and malformed dates', () => {
  for (const value of ['2026-02-30', '2026-13-01', '', '2026-9-9', null]) assert.throws(() => parseDate(value));
  assert.equal(parseDate('2024-02-29').toISOString().slice(0, 10), '2024-02-29');
});
test('recurring attendance requires matching weekday, date range and active schedule', () => {
  assert.equal(occurs(schedule, parseDate('2026-09-09')), true);
  assert.equal(occurs(schedule, parseDate('2026-09-10')), false);
  assert.equal(occurs(schedule, parseDate('2026-10-07')), false);
  assert.equal(occurs({ ...schedule, status: 'CANCELLED' }, parseDate('2026-09-09')), false);
});
test('single classes do not repeat', () => {
  const single = { ...schedule, scheduleType: 'SINGLE' };
  assert.equal(occurs(single, parseDate('2026-09-01')), true);
  assert.equal(occurs(single, parseDate('2026-09-09')), false);
});
test('leave expands exact scheduled dates only', () => {
  assert.deepEqual(sessionsBetween([schedule], '2026-09-08', '2026-09-17').map((s) => s.date), ['2026-09-09', '2026-09-16']);
  assert.throws(() => sessionsBetween([schedule], '2026-09-17', '2026-09-08'));
});
test('class start boundary is evaluated in IST', () => {
  assert.equal(started(schedule, '2026-09-09', new Date('2026-09-09T04:29:59Z')), false);
  assert.equal(started(schedule, '2026-09-09', new Date('2026-09-09T04:30:00Z')), true);
});
