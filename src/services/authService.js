const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../config/prisma");
const env = require("../config/env");

const publicUserFields = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  themePreference: true,
  tutor: {
    select: {
      id: true,
      employeeCode: true,
      designation: true,
    },
  },
  student: {
    select: {
      id: true,
      studentCode: true,
      profileStatus: true,
    },
  },
};

function withRoleProfile(user) {
  if (!user) return user;
  return {
    ...user,
    tutorId: user.tutor?.id || null,
    studentId: user.student?.id || null,
  };
}

async function login(email, password, userAgent = 'Unknown browser') {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== "ACTIVE") {
    const error = new Error("This account is not active");
    error.statusCode = 403;
    throw error;
  }

  const sessionId = require('node:crypto').randomUUID();
  const token = jwt.sign(
    { sub: user.id, role: user.role, sessionVersion: user.sessionVersion, sid: sessionId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  await prisma.adminSession.create({ data: { id: sessionId, userId: user.id, userAgent: String(userAgent).slice(0, 300), sessionVersion: user.sessionVersion, expiresAt: new Date(jwt.decode(token).exp * 1000) } });
  const safeUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: publicUserFields,
  });

  return { token, user: withRoleProfile(safeUser) };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserFields,
  });
  return withRoleProfile(user);
}

async function logout(userId, sessionId) {
  if (!sessionId) return;
  await prisma.adminSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

async function changePassword(userId, input = {}) {
  const { currentPassword, newPassword, confirmPassword } = input;
  if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || typeof confirmPassword !== "string") fail("All password fields are required");
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) fail("New password must contain at least 8 characters and at most 72 UTF-8 bytes");
  if (newPassword !== confirmPassword) fail("New password and confirmation do not match");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const allowedRoles = ["ADMIN", "SUPER_ADMIN", "TUTOR"];
  if (!user || user.status !== "ACTIVE" || !allowedRoles.includes(user.role)) fail("Admin or tutor access required", 403);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) fail("Current password is incorrect");
  if (await bcrypt.compare(newPassword, user.passwordHash)) fail("New password must differ from your current password");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.updateMany({
    where: { id: userId, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion, status: "ACTIVE", role: { in: allowedRoles } },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  if (updated.count !== 1) fail("Your account changed. Please sign in again and retry", 409);
}

module.exports = { login, logout, getCurrentUser, changePassword, withRoleProfile };
