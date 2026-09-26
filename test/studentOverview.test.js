const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'student-overview-unit-test-secret-123456789';
const { summarize } = require('../src/services/admins/adminStudentOverviewService');
test('attendance excludes leave from denominator and has no fabricated zero percentage', () => {
  assert.equal(summarize([], []).attendance.percentage, null);
  assert.equal(summarize([{ status: 'LEAVE' }], []).attendance.percentage, null);
  const result = summarize([{ status: 'PRESENT' }, { status: 'ABSENT' }, { status: 'LEAVE' }], []);
  assert.equal(result.attendance.percentage, 50); assert.equal(result.attendance.total, 3);
});
test('fees exclude draft/cancelled, preserve partial balances and round decimal totals', () => {
  const result = summarize([], [{ status: 'PARTIALLY_PAID', totalAmount: '100.10', paidAmount: '20.05' }, { status: 'PAID', totalAmount: '50', paidAmount: '50' }, { status: 'DRAFT', totalAmount: '999', paidAmount: '0' }, { status: 'CANCELLED', totalAmount: '999', paidAmount: '0' }]);
  assert.deepEqual(result.fees, { invoiced: 150.1, paid: 70.05, outstanding: 80.05 });
});
