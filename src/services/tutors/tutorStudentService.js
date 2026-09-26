const prisma = require("../../config/prisma");
const { getTutorForUser } = require("./tutorScheduleService");
const { buildTutorStudentFilters } = require("./tutorStudentFilterService");

async function getTutorStudents(userId, query = {}) {
  const tutor = await getTutorForUser(userId);
  const [academicSession, assignments] = await Promise.all([
    prisma.academicSession.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.batchSubject.findMany({
      where: { tutorId: tutor.id, batch: { status: "ACTIVE" } },
      select: {
        batchId: true,
        subject: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true, academicSessionId: true } },
      },
      orderBy: { batch: { name: "asc" } },
    }),
  ]);

  if (!academicSession) return { students: [], assignedBatches: [], academicSession: null };
  const currentAssignments = assignments.filter((item) => item.batch.academicSessionId === academicSession.id);
  const batchIds = [...new Set(currentAssignments.map((item) => item.batchId))];
  const subjectMap = new Map();
  for (const item of currentAssignments) {
    const subjects = subjectMap.get(item.batchId) || [];
    subjects.push(item.subject);
    subjectMap.set(item.batchId, subjects);
  }
  const assignedBatches = [...new Map(currentAssignments.map((item) => [item.batch.id, {
    id: item.batch.id,
    name: item.batch.name,
    subjects: subjectMap.get(item.batch.id) || [],
  }])).values()];
  if (!batchIds.length) return { students: [], assignedBatches, academicSession };

  const admissions = await prisma.admission.findMany({
    where: buildTutorStudentFilters(batchIds, academicSession.id, query),
    select: {
      id: true,
      joiningDate: true,
      student: { select: {
        id: true, studentCode: true, parentName: true, parentPhone: true, profileStatus: true,
        user: { select: { name: true, email: true, status: true } },
      } },
      grade: { select: { id: true, gradeName: true } },
      board: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true } },
    },
    orderBy: [{ student: { user: { name: "asc" } } }, { joiningDate: "asc" }],
  });

  const students = admissions.map((item) => ({
    admissionId: item.id,
    id: item.student.id,
    studentCode: item.student.studentCode,
    name: item.student.user.name,
    email: item.student.user.email,
    phone: item.student.parentPhone,
    parentName: item.student.parentName,
    profileStatus: item.student.profileStatus,
    status: item.student.user.status,
    gradeId: item.grade.id,
    grade: item.grade.gradeName,
    boardId: item.board.id,
    board: item.board.name,
    boardCode: item.board.code,
    batchId: item.batch.id,
    batchName: item.batch.name,
    tutorSubjects: subjectMap.get(item.batch.id) || [],
    joiningDate: item.joiningDate,
  }));
  return { students, assignedBatches, academicSession };
}

module.exports = { getTutorStudents };
