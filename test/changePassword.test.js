const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-password-test-secret-123456789';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let account; let conflict = false;
const path = require.resolve('../src/config/prisma');
const sessions = new Map();
require.cache[path] = { id: path, filename: path, loaded: true, exports: { user: {
  findUnique: async () => account,
  updateMany: async ({ where, data }) => {
    assert.equal(where.id, account.id); assert.equal(where.passwordHash, account.passwordHash);
    if (conflict) return { count: 0 };
    account = { ...account, passwordHash: data.passwordHash, sessionVersion: account.sessionVersion + 1 };
    return { count: 1 };
  },
  update: async () => ({ id: account.id, role: account.role }),
}, adminSession: { create: async ({ data }) => { sessions.set(data.id, data); return data; }, findUnique: async ({ where }) => sessions.get(where.id) } } };
const service = require('../src/services/authService');
const authenticate = require('../src/middleware/authenticate');
const input = { currentPassword: 'Old-password-123', newPassword: 'New-password-456', confirmPassword: 'New-password-456' };
async function reset(role = 'ADMIN') { conflict = false; account = { id: 'admin', role, status: 'ACTIVE', passwordHash: await bcrypt.hash(input.currentPassword, 4), sessionVersion: 0 }; }
async function auth(token) {
  let status = 200;
  await authenticate({ headers: { authorization: `Bearer ${token}` } }, { status(code) { status = code; return this; }, json() {} }, (error) => { if (error) throw error; });
  return status;
}
test('both admin roles can change password, old sessions and old password fail, fresh login works', async () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    await reset(role);
    const before = await service.login('admin@example.com', input.currentPassword);
    assert.equal(await auth(before.token), 200);
    await service.changePassword(account.id, input);
    assert.equal(await bcrypt.compare(input.newPassword, account.passwordHash), true);
    assert.equal(account.sessionVersion, 1);
    assert.equal(await auth(before.token), 401);
    assert.equal(await auth(jwt.sign({ sub: account.id }, process.env.JWT_SECRET)), 401);
    await assert.rejects(service.login('admin@example.com', input.currentPassword), { statusCode: 401 });
    const after = await service.login('admin@example.com', input.newPassword);
    assert.equal(await auth(after.token), 200);
    assert.equal(after.user.passwordHash, undefined);
  }
});
test('invalid passwords do not mutate account', async () => {
  await reset(); const hash = account.passwordHash;
  for (const values of [ {}, { ...input, currentPassword: 'wrong' }, { ...input, confirmPassword: 'different' }, { ...input, newPassword: 'short', confirmPassword: 'short' }, { ...input, newPassword: '🙂'.repeat(20), confirmPassword: '🙂'.repeat(20) }, { ...input, newPassword: input.currentPassword, confirmPassword: input.currentPassword } ]) {
    await assert.rejects(service.changePassword(account.id, values), { statusCode: 400 });
    assert.equal(account.passwordHash, hash); assert.equal(account.sessionVersion, 0);
  }
});
test('student and inactive admin cannot change password here; concurrent updates fail safely', async () => {
  await reset('STUDENT'); await assert.rejects(service.changePassword(account.id, input), { statusCode: 403 });
  await reset(); account.status = 'BLOCKED'; await assert.rejects(service.changePassword(account.id, input), { statusCode: 403 });
  await reset(); conflict = true; await assert.rejects(service.changePassword(account.id, input), { statusCode: 409 }); assert.equal(account.sessionVersion, 0);
});
