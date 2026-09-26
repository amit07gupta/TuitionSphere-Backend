const test = require('node:test');
const assert = require('node:assert/strict');

const prismaPath = require.resolve('../src/config/prisma');
const mock = {
  board: { findMany: async () => [{ id: 'board-1' }] },
  grade: { create: async ({ data }) => data },
};
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: mock };
const service = require('../src/services/admins/adminGradeService');

const input = {
  gradeName: 'Grade 1', numericValue: 1, learningStage: 'Primary Foundation',
  boardIds: ['board-1'], status: 'ACTIVE',
};

test('Grade 1 cannot be saved with the numeric value of a different grade', async () => {
  await assert.rejects(service.createGrade({ ...input, numericValue: 11 }), /Grade name and numeric value must match/);
  await assert.rejects(service.createGrade({ ...input, gradeName: 'Class 2', numericValue: 5 }), /Grade name and numeric value must match/);
});

test('a correctly numbered grade may be associated with a board', async () => {
  const created = await service.createGrade(input);
  assert.equal(created.numericValue, 1);
  assert.equal(created.boards.create[0].boardId, 'board-1');
});
