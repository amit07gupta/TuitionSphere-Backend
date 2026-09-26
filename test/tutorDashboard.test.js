const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-dashboard-test-secret-123456789';
const { occursOn } = require('../src/services/tutors/tutorDashboardService');
const recurring = { startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30'), status: 'SCHEDULED', scheduleType: 'RECURRING', repeatDays: ['TUESDAY'] };
test('dashboard counts recurring classes on the selected weekday', () => { assert.equal(occursOn(recurring, '2026-09-15'), true); assert.equal(occursOn(recurring, '2026-09-16'), false); });
test('dashboard counts a single class only on its start date', () => { const single = { ...recurring, scheduleType: 'SINGLE', startDate: new Date('2026-09-15'), endDate: new Date('2026-09-15') }; assert.equal(occursOn(single, '2026-09-15'), true); assert.equal(occursOn(single, '2026-09-16'), false); });
test('Swagger documents tutor dashboard endpoint', () => { assert.ok(require('../src/config/swagger').paths['/api/v1/tutor/dashboard'].get); });
