require('dotenv').config({ quiet: true });
const prisma = require('../src/config/prisma');

async function repair() {
  return prisma.$transaction(async (tx) => {
    const [gradeOne, duplicate] = await Promise.all([
      tx.grade.findUnique({ where: { numericValue: 1 } }),
      tx.grade.findUnique({ where: { id: 'cmu5ifir10002pgvaoei5swhv' } }),
    ]);
    if (!gradeOne || gradeOne.gradeName !== 'Grade 1') throw new Error('Canonical Grade 1 was not found');
    if (!duplicate) {
      const icseLink = await tx.gradeBoard.findFirst({ where: { gradeId: gradeOne.id, board: { code: 'ICSE' } } });
      if (!icseLink) throw new Error('Duplicate is gone, but Grade 1 is not linked to ICSE');
      return { status: 'already repaired' };
    }
    if (duplicate.gradeName !== 'Grade 1' || duplicate.numericValue === 1 || duplicate.learningStage !== 'Primary Foundation') {
      throw new Error('Record is not the expected ICSE Grade 1 duplicate');
    }

    const boards = await tx.gradeBoard.findMany({ where: { gradeId: duplicate.id }, include: { board: true } });
    if (boards.length !== 1 || boards[0].board.code !== 'ICSE') throw new Error('Duplicate grade has unexpected boards');

    const references = await Promise.all(
      ['batch', 'feePlan', 'demoSetup', 'demoRequest', 'admission', 'inquiry', 'notice']
        .map(async (model) => [model, await tx[model].count({ where: { gradeId: duplicate.id } })]),
    );
    if (references.some(([, count]) => count)) {
      throw new Error(`Duplicate grade still has dependent records: ${JSON.stringify(Object.fromEntries(references))}`);
    }

    const [subjectLinks, tutorLinks] = await Promise.all([
      tx.subjectGrade.findMany({ where: { gradeId: duplicate.id }, include: { subject: true } }),
      tx.tutorGrade.findMany({ where: { gradeId: duplicate.id } }),
    ]);
    if (subjectLinks.some((link) => link.subject.boardId !== boards[0].boardId)) {
      throw new Error('Duplicate grade has subjects outside ICSE');
    }

    await tx.gradeBoard.upsert({
      where: { gradeId_boardId: { gradeId: gradeOne.id, boardId: boards[0].boardId } },
      update: {},
      create: { gradeId: gradeOne.id, boardId: boards[0].boardId },
    });
    for (const link of subjectLinks) {
      await tx.subjectGrade.upsert({
        where: { subjectId_gradeId: { subjectId: link.subjectId, gradeId: gradeOne.id } },
        update: {},
        create: { subjectId: link.subjectId, gradeId: gradeOne.id },
      });
    }
    for (const link of tutorLinks) {
      await tx.tutorGrade.upsert({
        where: { tutorId_gradeId: { tutorId: link.tutorId, gradeId: gradeOne.id } },
        update: {},
        create: { tutorId: link.tutorId, gradeId: gradeOne.id },
      });
    }
    await tx.grade.delete({ where: { id: duplicate.id } });
    return { status: 'repaired', board: 'ICSE', subjectsMoved: subjectLinks.length, tutorsMoved: tutorLinks.length };
  });
}

repair()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
