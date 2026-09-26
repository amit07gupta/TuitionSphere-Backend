const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");

const statuses = ["ACTIVE", "INACTIVE"];
const allowedModes = ["Offline", "Online"];
const allowedStreams = ["Science", "Commerce"];
const defaultPassword = "Faculty@123";

const tutorInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },
  boards: {
    include: {
      board: true,
    },
  },
  grades: {
    include: {
      grade: true,
    },
  },
  subjects: {
    include: {
      subject: true,
    },
  },
};

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function uniqueList(value) {
  return [...new Set(Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [])];
}

function validateInput(input = {}, isUpdate = false) {
  const data = {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    phone: String(input.phone || "").replace(/\D/g, ""),
    employeeCode: String(input.employeeCode || "").trim().toUpperCase(),
    designation: String(input.designation || "").trim(),
    qualification: String(input.qualification || "").trim() || null,
    availability: String(input.availability || "").trim(),
    experience: input.experience === "" || input.experience == null ? null : Number(input.experience),
    joiningDate: new Date(input.joiningDate || input.joinedOn),
    status: String(input.status || "ACTIVE").toUpperCase(),
    boardIds: uniqueList(input.boardIds),
    gradeIds: uniqueList(input.gradeIds),
    subjectIds: uniqueList(input.subjectIds),
    modes: uniqueList(input.modes || input.mode),
    streams: uniqueList(input.streams),
    password: input.password ? String(input.password) : isUpdate ? null : defaultPassword,
  };

  if (data.name.length < 2) throw createHttpError("Enter a valid tutor name", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw createHttpError("Enter a valid email address", 400);
  if (data.phone.length !== 10) throw createHttpError("Phone number must contain exactly 10 digits", 400);
  if (!data.employeeCode) throw createHttpError("Employee code is required", 400);
  if (!data.designation) throw createHttpError("Designation is required", 400);
  if (data.experience != null && (!Number.isInteger(data.experience) || data.experience < 0 || data.experience > 60)) {
    throw createHttpError("Experience must be an integer between 0 and 60", 400);
  }
  if (Number.isNaN(data.joiningDate.getTime())) throw createHttpError("Joining date must be a valid date", 400);
  if (!statuses.includes(data.status)) throw createHttpError("Tutor status must be ACTIVE or INACTIVE", 400);
  if (!data.boardIds.length || !data.gradeIds.length || !data.subjectIds.length) {
    throw createHttpError("Select at least one board, grade and subject", 400);
  }
  if (!data.modes.length || data.modes.some((mode) => !allowedModes.includes(mode))) {
    throw createHttpError("Teaching modes can only contain Offline or Online", 400);
  }
  if (data.streams.some((stream) => !allowedStreams.includes(stream))) {
    throw createHttpError("Streams can only contain Science or Commerce", 400);
  }
  if (data.password && data.password.length < 8) throw createHttpError("Password must contain at least 8 characters", 400);

  return data;
}

async function validateAcademicRelations(data) {
  const [boards, grades, subjects, gradeBoards] = await Promise.all([
    prisma.board.findMany({ where: { id: { in: data.boardIds } }, select: { id: true } }),
    prisma.grade.findMany({ where: { id: { in: data.gradeIds } }, select: { id: true, numericValue: true } }),
    prisma.subject.findMany({
      where: { id: { in: data.subjectIds } },
      select: { id: true, boardId: true, streams: true, grades: { select: { gradeId: true } } },
    }),
    prisma.gradeBoard.findMany({
      where: { gradeId: { in: data.gradeIds }, boardId: { in: data.boardIds } },
      select: { gradeId: true, boardId: true },
    }),
  ]);

  if (boards.length !== data.boardIds.length) throw createHttpError("One or more selected boards do not exist", 400);
  if (grades.length !== data.gradeIds.length) throw createHttpError("One or more selected grades do not exist", 400);
  if (subjects.length !== data.subjectIds.length) throw createHttpError("One or more selected subjects do not exist", 400);

  const gradeBoardKeys = new Set(gradeBoards.map((item) => `${item.gradeId}:${item.boardId}`));
  if (data.gradeIds.some((gradeId) => !data.boardIds.some((boardId) => gradeBoardKeys.has(`${gradeId}:${boardId}`)))) {
    throw createHttpError("A selected grade is not applicable to the selected boards", 400);
  }

  const selectedGrades = new Set(data.gradeIds);
  const invalidSubject = subjects.some((subject) => !data.boardIds.includes(subject.boardId)
    || !subject.grades.some((item) => selectedGrades.has(item.gradeId))
    || (subject.streams.length && !subject.streams.some((stream) => data.streams.includes(stream))));
  if (invalidSubject) throw createHttpError("A selected subject does not match the selected board, grade or stream", 400);

  const hasSeniorGrade = grades.some((grade) => grade.numericValue >= 11);
  if (hasSeniorGrade && !data.streams.length) throw createHttpError("Select at least one stream for Grade 11 or Grade 12", 400);
  if (!hasSeniorGrade && data.streams.length) throw createHttpError("Streams are only applicable to Grade 11 and Grade 12", 400);
}

function listTutors(filters = {}) {
  const where = {};
  if (filters.status) {
    const status = String(filters.status).toUpperCase();
    if (!statuses.includes(status)) throw createHttpError("Invalid tutor status filter", 400);
    where.status = status;
  }
  if (filters.boardId) where.boards = { some: { boardId: String(filters.boardId) } };
  if (filters.gradeId) where.grades = { some: { gradeId: String(filters.gradeId) } };
  if (filters.subjectId) where.subjects = { some: { subjectId: String(filters.subjectId) } };

  return prisma.tutor.findMany({
    where,
    include: tutorInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getTutorById(id) {
  const tutor = await prisma.tutor.findUnique({
    where: { id },
    include: tutorInclude,
  });

  if (!tutor) {
    const error = new Error("Tutor not found");
    error.statusCode = 404;
    throw error;
  }

  return tutor;
}

async function createTutor(input) {
  const data = validateInput(input);
  await validateAcademicRelations(data);
  const passwordHash = await bcrypt.hash(data.password, 12);

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "TUTOR",
        status: data.status,
      },
    });

    return transaction.tutor.create({
      data: {
        userId: user.id,
        employeeCode: data.employeeCode,
        designation: data.designation,
        qualification: data.qualification,
        experience: data.experience,
        availability: data.availability,
        modes: data.modes,
        streams: data.streams,
        joiningDate: data.joiningDate,
        status: data.status,
        boards: { create: data.boardIds.map((boardId) => ({ boardId })) },
        grades: { create: data.gradeIds.map((gradeId) => ({ gradeId })) },
        subjects: { create: data.subjectIds.map((subjectId) => ({ subjectId })) },
      },
      include: tutorInclude,
    });
  });
}

async function updateTutor(id, input) {
  const current = await getTutorById(id);
  const data = validateInput(input, true);
  await validateAcademicRelations(data);
  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;

  return prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: current.userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    await transaction.tutorBoard.deleteMany({ where: { tutorId: id } });
    await transaction.tutorGrade.deleteMany({ where: { tutorId: id } });
    await transaction.tutorSubject.deleteMany({ where: { tutorId: id } });

    return transaction.tutor.update({
      where: { id },
      data: {
        employeeCode: data.employeeCode,
        designation: data.designation,
        qualification: data.qualification,
        experience: data.experience,
        availability: data.availability,
        modes: data.modes,
        streams: data.streams,
        joiningDate: data.joiningDate,
        status: data.status,
        boards: { create: data.boardIds.map((boardId) => ({ boardId })) },
        grades: { create: data.gradeIds.map((gradeId) => ({ gradeId })) },
        subjects: { create: data.subjectIds.map((subjectId) => ({ subjectId })) },
      },
      include: tutorInclude,
    });
  });
}

async function deleteTutor(id) {
  const tutor = await getTutorById(id);
  await prisma.user.delete({ where: { id: tutor.userId } });
}

module.exports = {
  listTutors,
  getTutorById,
  createTutor,
  updateTutor,
  deleteTutor,
};
