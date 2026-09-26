const test = require('node:test');
const assert = require('node:assert/strict');
const { hasScheduledDay, protectBookings } = require('../src/services/admins/demoSetupRules');
const start = new Date('2026-09-14T00:00:00Z');
const existing = { academicSessionId: 'session', gradeId: 'grade', tutorId: 'tutor', mode: 'ONLINE', stream: null, timeSlots: [{ id: 'slot', startTime: '10:00', endTime: '11:00', capacity: 3 }] };
const data = () => ({ ...existing, boardIds: ['board'], demoStartDate: start, demoEndDate: new Date('2026-09-20T00:00:00Z'), availableDays: ['Monday'], timeSlots: [{ startTime: '10:00', endTime: '11:00', capacity: 3 }] });
const booking = { demoSlotId: 'slot', demoDate: start, boardId: 'board', status: 'PENDING' };
test('date range must contain at least one selected weekday', () => {
  assert.equal(hasScheduledDay(start, start, ['Monday']), true);
  assert.equal(hasScheduledDay(start, start, ['Tuesday']), false);
  assert.equal(hasScheduledDay(start, new Date('2026-09-20'), ['Sunday']), true);
});
test('booked slot keeps its time and academic identity', () => {
  assert.doesNotThrow(() => protectBookings(existing, data(), [booking]));
  for (const change of [{ timeSlots: [] }, { tutorId: 'other' }, { mode: 'OFFLINE' }, { gradeId: 'other' }, { boardIds: [] }, { availableDays: ['Tuesday'] }, { demoStartDate: new Date('2026-09-15') }]) {
    assert.throws(() => protectBookings(existing, { ...data(), ...change }, [booking]), { statusCode: 409 });
  }
});
test('capacity is checked per date and cancelled history remains linked', () => {
  const reduced = { ...data(), timeSlots: [{ startTime: '10:00', endTime: '11:00', capacity: 1 }] };
  assert.throws(() => protectBookings(existing, reduced, [booking, booking]), { statusCode: 409 });
  assert.doesNotThrow(() => protectBookings(existing, reduced, [booking, { ...booking, status: 'CANCELLED' }]));
  assert.throws(() => protectBookings(existing, { ...data(), timeSlots: [] }, [{ ...booking, status: 'CANCELLED' }]), { statusCode: 409 });
});
