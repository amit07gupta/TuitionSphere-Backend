function fail(message) { throw Object.assign(new Error(message), { statusCode: 409 }); }
function hasScheduledDay(start, end, days) {
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + offset);
    if (date > end) break;
    if (days.includes(new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(date))) return true;
  }
  return false;
}
function protectBookings(existing, data, bookings) {
  if (!bookings.length) return;
  for (const key of ['academicSessionId', 'gradeId', 'tutorId', 'stream', 'mode']) {
    if ((existing[key] || null) !== (data[key] || null)) fail('This setup has bookings. Create a new setup to change its academic details, tutor or mode.');
  }
  const counts = new Map();
  for (const booking of bookings) {
    const oldSlot = existing.timeSlots.find(s => s.id === booking.demoSlotId);
    const slot = data.timeSlots.find(s => s.startTime === oldSlot?.startTime && s.endTime === oldSlot?.endTime);
    if (!slot) fail('A slot with booking history cannot be removed or have its times changed.');
    if (booking.status === 'CANCELLED') continue;
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(booking.demoDate);
    if (booking.demoDate < data.demoStartDate || booking.demoDate > data.demoEndDate || !data.availableDays.includes(weekday) || !data.boardIds.includes(booking.boardId)) fail('The new schedule or boards would exclude an existing booking.');
    const key = booking.demoSlotId + ':' + booking.demoDate.toISOString().slice(0, 10);
    const count = (counts.get(key) || 0) + 1; counts.set(key, count);
    if (slot.capacity < count) fail('Slot capacity cannot be below its existing bookings on a date.');
  }
}
module.exports = { hasScheduledDay, protectBookings };
