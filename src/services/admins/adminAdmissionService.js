const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../../config/prisma");
const { createInvoicesForAdmission } = require("./adminInvoiceService");

const DEFAULT_STUDENT_PASSWORD = "Student@123";
const sources = ["Walk-in", "Phone Call", "Referral", "Inquiry", "Direct Admission", "Book Demo"];

const admissionInclude = {
  student: { include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } } },
  demoRequest: true,
  academicSession: true,
  grade: true,
  board: true,
  batch: true,
  feePlan: true,
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw httpError("Select a valid joining date", 400);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw httpError("Select a valid joining date", 400);
  return date;
}

function validateInput(input = {}) {
  const studentName = String(input.studentName || "").trim();
  const parentName = String(input.parentName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").replace(/\D/g, "").slice(-10);
  const source = String(input.source || "Direct Admission").trim();
  const demoRequestId = String(input.demoRequestId || "").trim() || null;
  const academicSessionId = String(input.academicSessionId || "").trim();
  const gradeId = String(input.gradeId || "").trim();
  const boardId = String(input.boardId || "").trim();
  const batchId = String(input.batchId || "").trim();
  const feePlanId = String(input.feePlanId || "").trim();
  const joiningDate = parseDate(input.joiningDate);

  const namePattern = /^[\p{L}]+(?:\s+[\p{L}]+)*$/u;
  if (!namePattern.test(studentName) || !namePattern.test(parentName)) {
    throw httpError("Student and parent names can only contain letters and spaces", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError("Enter a valid student login email", 400);
  if (!/^[6-9]\d{9}$/.test(phone)) throw httpError("Enter a valid 10-digit parent phone number", 400);
  if (![academicSessionId, gradeId, boardId, batchId, feePlanId].every(Boolean)) throw httpError("Select session, grade, board, batch and fee plan", 400);
  if (!sources.includes(source)) throw httpError("Select a valid admission source", 400);
  return { studentName, parentName, email, phone, source, demoRequestId, academicSessionId, gradeId, boardId, batchId, feePlanId, joiningDate };
}

async function validateRelations(transaction, data) {
  const [session, gradeBoard, batch, feePlan, duplicateUser, demoRequest, enrolledCount] = await Promise.all([
    transaction.academicSession.findUnique({ where: { id: data.academicSessionId } }),
    transaction.gradeBoard.findUnique({ where: { gradeId_boardId: { gradeId: data.gradeId, boardId: data.boardId } } }),
    transaction.batch.findUnique({ where: { id: data.batchId } }),
    transaction.feePlan.findUnique({ where: { id: data.feePlanId } }),
    transaction.user.findUnique({ where: { email: data.email }, select: { id: true } }),
    data.demoRequestId ? transaction.demoRequest.findUnique({ where: { id: data.demoRequestId } }) : null,
    transaction.admission.count({ where: { batchId: data.batchId, status: "ENROLLED" } }),
  ]);

  if (!session || session.status !== "ACTIVE") throw httpError("Select an active academic session", 400);
  if (!gradeBoard) throw httpError("Selected board is not applicable to this grade", 400);
  if (!batch || batch.status !== "ACTIVE") throw httpError("Select an active batch", 400);
  if (batch.academicSessionId !== data.academicSessionId || batch.gradeId !== data.gradeId || batch.boardId !== data.boardId) {
    throw httpError("Batch does not match the selected session, grade and board", 400);
  }
  if (enrolledCount >= batch.capacity) throw httpError("Selected batch has reached its capacity", 409);
  if (!feePlan || feePlan.status !== "ACTIVE") throw httpError("Select an active fee plan", 400);
  if (feePlan.academicSessionId !== data.academicSessionId || feePlan.gradeId !== data.gradeId) {
    throw httpError("Fee plan does not match the selected session and grade", 400);
  }
  if (data.joiningDate < session.startDate || data.joiningDate > session.endDate) throw httpError("Joining date must be within the academic session", 400);
  if (data.joiningDate < feePlan.effectiveFrom || data.joiningDate > feePlan.effectiveTo) throw httpError("Fee plan is not effective on the joining date", 400);
  if (duplicateUser) throw httpError("A user already exists with this login email", 409);
  if (data.demoRequestId) {
    if (!demoRequest) throw httpError("Demo request not found", 404);
    if (demoRequest.status !== "ADMISSION_STARTED") throw httpError("Demo request is not ready for student creation", 409);
    if (demoRequest.gradeId !== data.gradeId || demoRequest.boardId !== data.boardId) throw httpError("Admission grade and board must match the demo request", 400);
    if (demoRequest.email !== data.email || demoRequest.phone !== data.phone) throw httpError("Admission contact details must match the demo request", 400);
  }
}

async function createAdmission(input) {
  const data = validateInput(input);
  const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 12);

  try {
    const admission = await prisma.$transaction(async (transaction) => {
      await validateRelations(transaction, data);
      const user = await transaction.user.create({
        data: { name: data.studentName, email: data.email, phone: null, passwordHash, role: "STUDENT", status: "ACTIVE" },
      });
      const student = await transaction.student.create({
        data: {
          studentCode: `TS-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
          userId: user.id,
          parentName: data.parentName,
          parentPhone: data.phone,
          profileStatus: "INCOMPLETE",
        },
      });
      const created = await transaction.admission.create({
        data: {
          studentId: student.id,
          demoRequestId: data.demoRequestId,
          academicSessionId: data.academicSessionId,
          gradeId: data.gradeId,
          boardId: data.boardId,
          batchId: data.batchId,
          feePlanId: data.feePlanId,
          source: data.source,
          joiningDate: data.joiningDate,
        },
        include: admissionInclude,
      });
      await createInvoicesForAdmission(transaction, created.id);
      if (data.demoRequestId) await transaction.demoRequest.update({ where: { id: data.demoRequestId }, data: { status: "ENROLLED" } });
      return created;
    });
    return { admission, temporaryPassword: DEFAULT_STUDENT_PASSWORD };
  } catch (error) {
    if (error.code === "P2002") throw httpError("Student or admission already exists", 409);
    throw error;
  }
}

function listAdmissions(query = {}) {
  const where = {};
  if (query.academicSessionId) where.academicSessionId = String(query.academicSessionId);
  if (query.gradeId) where.gradeId = String(query.gradeId);
  if (query.batchId) where.batchId = String(query.batchId);
  if (query.status) where.status = String(query.status).toUpperCase();
  return prisma.admission.findMany({ where, include: admissionInclude, orderBy: { createdAt: "desc" } });
}

async function getAdmission(id) {
  const admission = await prisma.admission.findUnique({ where: { id }, include: admissionInclude });
  if (!admission) throw httpError("Admission not found", 404);
  return admission;
}

module.exports = { createAdmission, listAdmissions, getAdmission };
