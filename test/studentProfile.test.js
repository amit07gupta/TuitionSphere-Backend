const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-profile-test-secret-123456789';
const { validateDetails, validateTheme, updateTheme } = require('../src/services/students/studentProfileService');

test('student profile accepts editable guardian details and rejects academic identity changes', () => {
  assert.deepEqual(validateDetails({ address: '123 Main Street', parentPhone: '9876543210' }), { address: '123 Main Street', parentPhone: '9876543210' });
  assert.throws(() => validateDetails({ communicationPreference: 'WhatsApp' }), /Invalid student profile fields/);
  assert.throws(() => validateDetails({ relationship: 'Mother' }), /Invalid student profile fields/);
  assert.throws(() => validateDetails({ gradeId: 'other-grade' }), /Invalid student profile fields/);
  assert.throws(() => validateDetails({ email: 'different@example.com' }), /Invalid student profile fields/);
});

test('student profile rejects malformed dates and contact details', () => {
  assert.throws(() => validateDetails({ dateOfBirth: '2026-02-30' }), /valid date of birth/);
  assert.throws(() => validateDetails({ emergencyContact: '123' }), /10-digit/);
});

test('student theme accepts only an explicit supported preference', () => {
  assert.equal(validateTheme({ themePreference: 'DARK' }), 'DARK');
  assert.throws(() => validateTheme({ themePreference: 'dark' }), /valid theme/);
  assert.throws(() => validateTheme({ themePreference: 'LIGHT', status: 'ACTIVE' }), /valid theme/);
});

test('student theme is saved to the signed-in account only', async () => {
  const updates = [];
  const db = {
    student: { findUnique: async ({ where }) => where.userId === 'student-user' ? { id: 'student' } : null },
    user: { update: async (query) => { updates.push(query); return { themePreference: query.data.themePreference }; } },
  };
  assert.deepEqual(await updateTheme('student-user', { themePreference: 'DARK' }, db), { themePreference: 'DARK' });
  assert.deepEqual(updates, [{ where: { id: 'student-user' }, data: { themePreference: 'DARK' }, select: { themePreference: true } }]);
  await assert.rejects(updateTheme('other-user', { themePreference: 'LIGHT' }, db), /Student profile not found/);
  assert.equal(updates.length, 1);
});

test('Swagger documents student-owned profile operations', () => {
  const paths = require('../src/config/swagger').paths;
  for (const path of ['/api/v1/student/profile', '/api/v1/student/profile/photo', '/api/v1/student/profile/theme', '/api/v1/student/profile/correction-requests']) assert.ok(paths[path]);
});
