const test = require('node:test');
const assert = require('node:assert/strict');
const { archiveChange } = require('../src/services/admins/adminAssignmentService');
test('archiving preserves the original publication status', () => {
  assert.deepEqual(archiveChange({ status: 'DRAFT' }, { action: 'archive', expectedStatus: 'Draft' }), { status: 'ARCHIVED', archivedFromStatus: 'DRAFT' });
  assert.deepEqual(archiveChange({ status: 'PUBLISHED' }, { action: 'archive', expectedStatus: 'Published' }), { status: 'ARCHIVED', archivedFromStatus: 'PUBLISHED' });
});
test('restoring a draft never publishes it', () => {
  assert.equal(archiveChange({ status: 'ARCHIVED', archivedFromStatus: 'DRAFT' }, { action: 'restore', expectedStatus: 'Archived' }).status, 'DRAFT');
  assert.equal(archiveChange({ status: 'ARCHIVED', archivedFromStatus: 'PUBLISHED' }, { action: 'restore', expectedStatus: 'Archived' }).status, 'PUBLISHED');
});
test('unknown archived origin restores safely to draft', () => {
  assert.equal(archiveChange({ status: 'ARCHIVED' }, { action: 'restore', expectedStatus: 'Archived' }).status, 'DRAFT');
});
test('stale and invalid archive transitions are rejected', () => {
  assert.throws(() => archiveChange({ status: 'DRAFT' }, { action: 'archive', expectedStatus: 'Published' }), /changed/);
  assert.throws(() => archiveChange({ status: 'DRAFT' }, { action: 'restore', expectedStatus: 'Draft' }), /Only archived/);
  assert.throws(() => archiveChange({ status: 'ARCHIVED' }, { action: 'archive', expectedStatus: 'Archived' }), /already archived/);
  assert.throws(() => archiveChange({ status: 'DRAFT' }, { action: 'publish' }), /Choose archive/);
});
