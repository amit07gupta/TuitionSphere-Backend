const prisma = require('../../config/prisma');

const fields = new Set(['dateOfBirth', 'gender', 'address', 'parentPhone', 'emergencyContact']);
const correctionFields = new Set(['Contact information', 'Personal information', 'Guardian information', 'Academic information', 'Other correction']);
const phonePattern = /^[6-9]\d{9}$/;
const photoPattern = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }

function validateDetails(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some((key) => !fields.has(key))) fail('Invalid student profile fields');
  const data = {};
  if ('dateOfBirth' in input) {
    const value = String(input.dateOfBirth || '');
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > new Date()) fail('Enter a valid date of birth');
    data.dateOfBirth = date;
  }
  if ('gender' in input) {
    if (!['Male', 'Female', 'Other'].includes(input.gender)) fail('Select a valid gender');
    data.gender = input.gender;
  }
  if ('address' in input) {
    const value = String(input.address || '').trim();
    if (value.length < 5 || value.length > 500) fail('Address must contain 5 to 500 characters');
    data.address = value;
  }
  for (const field of ['parentPhone', 'emergencyContact']) {
    if (field in input) {
      const value = String(input[field] || '').trim();
      if (field === 'parentPhone' || value) { if (!phonePattern.test(value)) fail(`${field === 'parentPhone' ? 'Parent phone' : 'Alternate contact number'} must be a valid 10-digit mobile number`); }
      data[field] = value || null;
    }
  }
  return data;
}

function normalize(row) {
  const admission = row.admissions.find((item) => item.status === 'ENROLLED') || row.admissions[0];
  return {
    id: row.id, studentCode: row.studentCode, name: row.user.name, email: row.user.email,
    status: row.user.status, profilePhoto: row.user.avatar, themePreference: row.user.themePreference, parentName: row.parentName,
    phone: row.parentPhone, dateOfBirth: row.dateOfBirth, gender: row.gender,
    address: row.address, emergencyContact: row.emergencyContact,
    profileStatus: row.profileStatus,
    profileUpdatedAt: row.updatedAt, joinedOn: admission?.joiningDate || row.createdAt,
    grade: admission?.grade?.numericValue ?? null, board: admission?.board?.code || '',
    batch: admission?.batch?.name || '', learningMode: admission?.batch?.learningMode || '',
    academicSession: admission?.academicSession?.name || '',
    subjects: admission?.batch?.subjects?.map((item) => item.subject.name) || [],
  };
}

async function getProfile(userId) {
  const row = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, status: true, avatar: true, themePreference: true } },
      admissions: { orderBy: { createdAt: 'desc' }, include: {
        grade: true, board: true, academicSession: true,
        batch: { include: { subjects: { include: { subject: true } } } },
      } },
    },
  });
  if (!row) fail('Student profile not found', 404);
  return normalize(row);
}

async function updateProfile(userId, input) {
  const data = validateDetails(input);
  const current = await prisma.student.findUnique({ where: { userId }, select: { dateOfBirth: true, gender: true, address: true } });
  if (!current) fail('Student profile not found', 404);
  const merged = { ...current, ...data };
  data.profileStatus = merged.dateOfBirth && merged.gender && merged.address ? 'COMPLETE' : 'INCOMPLETE';
  await prisma.student.update({ where: { userId }, data });
  return getProfile(userId);
}

async function updatePhoto(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !('avatar' in input)) fail('Provide a profile photo');
  const avatar = input.avatar;
  if (avatar !== null && (typeof avatar !== 'string' || avatar.length > 180000 || !photoPattern.test(avatar))) fail('Choose a PNG, JPEG or WebP image under 130 KB');
  await prisma.user.update({ where: { id: userId }, data: { avatar } });
  return getProfile(userId);
}

function validateTheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !('themePreference' in input) || !['LIGHT', 'DARK', 'SYSTEM'].includes(input.themePreference)) fail('Select a valid theme');
  return input.themePreference;
}

async function updateTheme(userId, input, db = prisma) {
  const themePreference = validateTheme(input);
  const student = await db.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) fail('Student profile not found', 404);
  const user = await db.user.update({ where: { id: userId }, data: { themePreference }, select: { themePreference: true } });
  return user;
}

async function createCorrectionRequest(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !['field', 'details'].includes(key))) fail('Invalid correction request');
  const field = String(input.field || '').trim();
  const details = String(input.details || '').trim();
  if (!correctionFields.has(field) || details.length < 10 || details.length > 500) fail('Select a field and describe the correction in 10 to 500 characters');
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) fail('Student profile not found', 404);
  return prisma.studentProfileRequest.create({ data: { studentId: student.id, field, details } });
}

module.exports = { getProfile, updateProfile, updatePhoto, updateTheme, createCorrectionRequest, validateDetails, validateTheme };
