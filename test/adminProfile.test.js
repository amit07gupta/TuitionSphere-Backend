const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInput } = require('../src/services/admins/adminProfileService');
test('profile normalizes editable details and supports partial updates', () => {
  assert.deepEqual(validateInput({ name: '  Amit Gupta  ', phone: '(98765) 43210' }), { name: 'Amit Gupta', phone: '9876543210' });
  assert.deepEqual(validateInput({ phone: '' }), { phone: null });
  assert.deepEqual(validateInput({ name: 'Amit' }), { name: 'Amit' });
});
test('profile rejects privilege, identity and credential changes', () => {
  for (const key of ['id', 'email', 'role', 'status', 'password', 'passwordHash', 'sessionVersion']) {
    assert.throws(() => validateInput({ name: 'Amit', [key]: 'changed' }), { statusCode: 400 });
  }
});
test('profile rejects malformed or empty input', () => {
  for (const value of [null, [], {}, { name: ' ' }, { name: 123 }, { name: 'x'.repeat(101) }, { phone: 1234567890 }, { phone: '987654321' }, { phone: 'abcdefghij' }]) {
    assert.throws(() => validateInput(value), { statusCode: 400 });
  }
});
