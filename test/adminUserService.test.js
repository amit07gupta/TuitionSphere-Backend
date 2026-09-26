const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInput, protectAccess } = require('../src/services/admins/adminUserService');
const { buildAdminUserFilters } = require('../src/services/admins/adminUserFilterService');
const input = { name: ' Test Admin ', email: 'ADMIN@EXAMPLE.COM ', phone: '(987) 654-3210', role: 'Admin', status: 'Active', password: 'Example-Pass-123' };
test('normalizes identity and never copies password into editable fields', () => {
  const data = validateInput(input, true);
  assert.deepEqual(data, { name: 'Test Admin', email: 'admin@example.com', phone: '9876543210', role: 'ADMIN', status: 'ACTIVE' });
});
test('rejects weak/oversized passwords, invalid roles and malformed contacts', () => {
  for (const change of [{ password: 'short' }, { password: '🔑'.repeat(19) }, { role: 'Student' }, { name: 'a' }, { email: 'broken' }, { phone: 'abcdef1234' }]) assert.throws(() => validateInput({ ...input, ...change }, true));
  assert.throws(() => validateInput(input), /Password changes/);
});
test('protects current Super Admin from self-deactivation and demotion', async () => {
  for (const data of [{ status: 'INACTIVE', role: 'SUPER_ADMIN' }, { status: 'BLOCKED', role: 'SUPER_ADMIN' }, { status: 'ACTIVE', role: 'ADMIN' }]) {
    await assert.rejects(protectAccess({}, { id: 'self' }, data, 'self'), /currently in use/);
  }
});
test('protects the last active Super Admin for both role and status changes', async () => {
  const tx = { user: { count: async () => 0 } };
  const existing = { id: 'last', role: 'SUPER_ADMIN', status: 'ACTIVE' };
  await assert.rejects(protectAccess(tx, existing, { role: 'ADMIN', status: 'ACTIVE' }, 'other'), /At least one/);
  await assert.rejects(protectAccess(tx, existing, { role: 'SUPER_ADMIN', status: 'INACTIVE' }, 'other'), /At least one/);
});
test('ordinary admin changes do not require a second Super Admin', async () => {
  await protectAccess({}, { id: 'ordinary', role: 'ADMIN', status: 'ACTIVE' }, { role: 'ADMIN', status: 'INACTIVE' }, 'actor');
});
test('list filters only include administrative roles', () => {
  assert.deepEqual(buildAdminUserFilters().role, { in: ['ADMIN', 'SUPER_ADMIN'] });
  assert.equal(buildAdminUserFilters({ role: 'Super Admin' }).role, 'SUPER_ADMIN');
  assert.throws(() => buildAdminUserFilters({ role: 'Student' }));
});
