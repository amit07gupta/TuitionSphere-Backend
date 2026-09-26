const prisma = require("../../config/prisma");

const studentInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true } },
  admissions: {
    include: { academicSession: true, grade: true, board: true, batch: { include: { subjects: { include: { subject: true } } } }, feePlan: true },
    orderBy: { createdAt: "desc" },
  },
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (!status) return null;
  if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) throw httpError("Invalid student account status", 400);
  return status;
}

function studentWhere(query = {}) {
  const where = {};
  const status = String(query.status || "").trim().toUpperCase();
  if (status && status !== "ALL") where.user = { status };
  if (query.profileStatus) where.profileStatus = String(query.profileStatus).trim().toUpperCase();
  const admission = {};
  if (query.academicSessionId) admission.academicSessionId = String(query.academicSessionId);
  if (query.gradeId) admission.gradeId = String(query.gradeId);
  if (query.boardId) admission.boardId = String(query.boardId);
  if (query.batchId) admission.batchId = String(query.batchId);
  if (Object.keys(admission).length) where.admissions = { some: admission };
  const search = String(query.search || "").trim();
  if (search) {
    where.OR = [
      { studentCode: { contains: search, mode: "insensitive" } },
      { parentName: { contains: search, mode: "insensitive" } },
      { parentPhone: { contains: search } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

function listStudents(query) {
  return prisma.student.findMany({ where: studentWhere(query), include: studentInclude, orderBy: { createdAt: "desc" } });
}

async function getStudent(id) {
  const student = await prisma.student.findFirst({
    where: { OR: [{ id }, { studentCode: id }] },
    include: studentInclude,
  });
  if (!student) throw httpError("Student not found", 404);
  return student;
}

async function listProfileRequests(id) {
  const student = await getStudent(id);
  return prisma.studentProfileRequest.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } });
}

async function updateStudent(id, input = {}) {
  const existing = await getStudent(id);
  const userStatus = normalizeStatus(input.status);
  const studentData = {};
  const userData = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (name.length < 2) throw httpError("Enter a valid student name", 400);
    userData.name = name;
  }
  if (input.parentName !== undefined) {
    const parentName = String(input.parentName).trim();
    if (parentName.length < 2) throw httpError("Enter a valid parent name", 400);
    studentData.parentName = parentName;
  }
  if (input.parentPhone !== undefined) {
    const parentPhone = String(input.parentPhone).replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(parentPhone)) throw httpError("Enter a valid 10-digit parent phone number", 400);
    studentData.parentPhone = parentPhone;
  }
  for (const field of ["gender", "address"]) {
    if (input[field] !== undefined) studentData[field] = String(input[field] || "").trim() || null;
  }
  if (input.dateOfBirth !== undefined) {
    const date = input.dateOfBirth ? new Date(`${String(input.dateOfBirth).slice(0, 10)}T00:00:00.000Z`) : null;
    if (date && Number.isNaN(date.getTime())) throw httpError("Enter a valid date of birth", 400);
    studentData.dateOfBirth = date;
  }
  if (input.profileStatus !== undefined) {
    const profileStatus = String(input.profileStatus).toUpperCase();
    if (!["INCOMPLETE", "COMPLETE"].includes(profileStatus)) throw httpError("Invalid profile status", 400);
    studentData.profileStatus = profileStatus;
  }
  if (userStatus) userData.status = userStatus;

  await prisma.$transaction(async (transaction) => {
    if (Object.keys(userData).length) await transaction.user.update({ where: { id: existing.userId }, data: userData });
    if (Object.keys(studentData).length) await transaction.student.update({ where: { id: existing.id }, data: studentData });
  });
  return getStudent(existing.id);
}

async function transferStudent(id, input = {}) {
  const existing = await getStudent(id);
  const admission = existing.admissions.find((item) => item.status === "ENROLLED") || existing.admissions[0];
  if (!admission) throw httpError("Active admission not found", 409);
  const batchId = String(input.batchId || "").trim();
  if (!batchId) throw httpError("Select a batch", 400);
  if (batchId === admission.batchId) return existing;

  await prisma.$transaction(async (transaction) => {
    const [batch, enrolledCount] = await Promise.all([
      transaction.batch.findUnique({ where: { id: batchId } }),
      transaction.admission.count({ where: { batchId, status: "ENROLLED" } }),
    ]);
    if (!batch || batch.status !== "ACTIVE") throw httpError("Select an active batch", 400);
    if (batch.academicSessionId !== admission.academicSessionId || batch.gradeId !== admission.gradeId || batch.boardId !== admission.boardId) {
      throw httpError("The selected batch must match the student's session, grade and board", 400);
    }
    if (enrolledCount >= batch.capacity) throw httpError("Selected batch has reached its capacity", 409);
    await transaction.admission.update({ where: { id: admission.id }, data: { batchId } });
  });
  return getStudent(existing.id);
}

module.exports = { listStudents, getStudent, updateStudent, transferStudent, listProfileRequests };
