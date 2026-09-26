const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");

const requestInclude = {
  demoSetup: {
    include: {
      tutor: { include: { user: { select: { id: true, name: true } } } },
    },
  },
  demoSlot: true,
  grade: true,
  board: true,
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function bookingDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw httpError("Select a valid demo date", 400);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw httpError("Select a valid demo date", 400);
  return date;
}

function validateInput(input = {}) {
  const studentName = String(input.studentName || "").trim();
  const parentName = String(input.parentName || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").replace(/\D/g, "").slice(-10);
  const demoSetupId = String(input.demoSetupId || "").trim();
  const demoSlotId = String(input.demoSlotId || "").trim();
  const gradeId = String(input.gradeId || "").trim();
  const boardId = String(input.boardId || "").trim();
  const stream = String(input.stream || "").trim() || null;
  const demoDate = bookingDate(input.demoDate);

  if (studentName.length < 2) throw httpError("Enter a valid student name", 400);
  if (parentName.length < 2) throw httpError("Enter a valid parent or guardian name", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError("Enter a valid email address", 400);
  if (!/^[6-9]\d{9}$/.test(phone)) throw httpError("Enter a valid 10-digit Indian mobile number", 400);
  if (!demoSetupId || !demoSlotId || !gradeId || !boardId) throw httpError("Select a valid grade, board, date and demo slot", 400);

  return { studentName, parentName, email, phone, demoSetupId, demoSlotId, gradeId, boardId, stream, demoDate };
}

async function createDemoRequest(input) {
  const data = validateInput(input);

  try {
    return await prisma.$transaction(async (transaction) => {
      const setup = await transaction.demoSetup.findUnique({
        where: { id: data.demoSetupId },
        include: { academicSession: true, boards: true, timeSlots: true },
      });

      if (!setup || setup.status !== "ACTIVE" || setup.academicSession.status !== "ACTIVE") {
        throw httpError("This demo schedule is no longer available", 409);
      }
      if (setup.gradeId !== data.gradeId || !setup.boards.some((item) => item.boardId === data.boardId)) {
        throw httpError("The selected grade or board does not match this demo schedule", 400);
      }
      if ((setup.stream || null) !== data.stream) throw httpError("The selected stream does not match this demo schedule", 400);

      const slot = setup.timeSlots.find((item) => item.id === data.demoSlotId);
      if (!slot) throw httpError("The selected demo slot is not available", 409);
      if (data.demoDate < setup.demoStartDate || data.demoDate > setup.demoEndDate) {
        throw httpError("The selected date is outside the demo schedule", 400);
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (data.demoDate < today) throw httpError("Demo date cannot be in the past", 400);
      const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(data.demoDate);
      if (!setup.availableDays.includes(weekday)) throw httpError("Demo is not available on the selected day", 400);

      const duplicate = await transaction.demoRequest.findFirst({
        where: {
          demoDate: data.demoDate,
          demoSlotId: data.demoSlotId,
          status: { not: "CANCELLED" },
          OR: [{ email: data.email }, { phone: data.phone }],
        },
      });
      if (duplicate) throw httpError("You already selected a demo for this date and time", 409);

      const booked = await transaction.demoRequest.count({
        where: { demoDate: data.demoDate, demoSlotId: data.demoSlotId, status: { not: "CANCELLED" } },
      });
      if (booked >= slot.capacity) throw httpError("This demo slot is full. Please select another slot", 409);

      return transaction.demoRequest.create({ data, include: requestInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error.code === "P2002") throw httpError("You already selected a demo for this date and time", 409);
    if (error.code === "P2034") throw httpError("This slot was just updated. Please try again", 409);
    throw error;
  }
}

module.exports = { createDemoRequest };
