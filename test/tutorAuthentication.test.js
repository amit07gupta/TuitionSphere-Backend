const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-tutor-auth-test-secret-123456789';

let revokedSession;
const prismaPath = require.resolve('../src/config/prisma');
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: {
    adminSession: {
      updateMany: async ({ where, data }) => {
        revokedSession = { where, data };
        return { count: 1 };
      },
    },
  },
};

const { logout, withRoleProfile } = require('../src/services/authService');

test('tutor authentication exposes the tutor profile id without credentials', () => {
  const user = withRoleProfile({
    id: 'user-1',
    name: 'Harsh Tutor',
    email: 'harsh121@gmail.com',
    role: 'TUTOR',
    status: 'ACTIVE',
    tutor: { id: 'tutor-1', employeeCode: 'TUT-001', designation: 'Tutor' },
  });

  assert.equal(user.tutorId, 'tutor-1');
  assert.equal(user.tutor.employeeCode, 'TUT-001');
  assert.equal(user.passwordHash, undefined);
});

test('non-tutor accounts do not receive a tutor profile id', () => {
  assert.equal(withRoleProfile({ id: 'admin-1', role: 'ADMIN', tutor: null }).tutorId, null);
  assert.equal(withRoleProfile(null), null);
});

test('logout revokes only the current user-owned session', async () => {
  revokedSession = null;
  await logout('user-1', 'session-1');
  assert.deepEqual(revokedSession.where, { id: 'session-1', userId: 'user-1', revokedAt: null });
  assert.ok(revokedSession.data.revokedAt instanceof Date);
  revokedSession = null;
  await logout('user-1', undefined);
  assert.equal(revokedSession, null);
});
