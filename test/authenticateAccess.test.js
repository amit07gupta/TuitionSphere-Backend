const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-auth-unit-test-secret-123456789';
const jwt = require('jsonwebtoken');
let account; let databaseError;
const path = require.resolve('../src/config/prisma');
require.cache[path] = { id: path, filename: path, loaded: true, exports: { user: { findUnique: async () => { if (databaseError) throw databaseError; return account; } } } };
const authenticate = require('../src/middleware/authenticate');
const authorize = require('../src/middleware/authorize');
const token = jwt.sign({ sub: 'user', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET);
async function run(header = `Bearer ${token}`) {
  const req = { headers: { authorization: header } }; let status; let forwarded; let passed = false;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  await authenticate(req, res, (e) => { if (e) forwarded = e; else passed = true; });
  return { req, res, passed, forwarded, get status() { return status; } };
}
test('old token uses the current database role and cannot retain Super Admin access', async () => {
  account = { id: 'user', status: 'ACTIVE', role: 'ADMIN' };
  const result = await run(); assert.equal(result.passed, true); assert.equal(result.req.user.role, 'ADMIN');
  authorize('SUPER_ADMIN')(result.req, result.res, () => assert.fail('Access must be denied'));
  assert.equal(result.status, 403);
});
test('inactive, blocked and deleted accounts cannot reuse existing tokens', async () => {
  for (const status of ['INACTIVE', 'BLOCKED', null]) {
    account = status ? { id: 'user', status, role: 'SUPER_ADMIN' } : null;
    const result = await run(); assert.equal(result.status, 403); assert.equal(result.passed, false);
  }
});
test('missing and invalid tokens fail authentication', async () => {
  assert.equal((await run('')).status, 401); assert.equal((await run('Bearer invalid')).status, 401);
});
test('database errors reach error middleware instead of masquerading as invalid tokens', async () => {
  databaseError = new Error('unavailable');
  try { assert.equal((await run()).forwarded, databaseError); } finally { databaseError = null; }
});
