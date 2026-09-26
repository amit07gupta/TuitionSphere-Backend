const prisma = require('../../config/prisma');
const sessionService = require('../admins/adminProfileService');
const userFields = { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, lastLoginAt: true, avatar: true, notificationPreferences: true, themePreference: true };
const tutorInclude = { boards: { include: { board: { select: { id: true, name: true, code: true } } } }, grades: { include: { grade: { select: { id: true, gradeName: true } } } }, subjects: { include: { subject: { select: { id: true, name: true, code: true } } } } };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function normalize(row) { return { ...row.user, tutorId: row.id, employeeCode: row.employeeCode, designation: row.designation, qualification: row.qualification, experience: row.experience, availability: row.availability, modes: row.modes, streams: row.streams, joiningDate: row.joiningDate, tutorStatus: row.status, boards: row.boards.map(x => x.board), grades: row.grades.map(x => x.grade), subjects: row.subjects.map(x => x.subject) }; }
async function getProfile(userId) { const row = await prisma.tutor.findUnique({ where: { userId }, include: { user: { select: userFields }, ...tutorInclude } }); if (!row) fail('Tutor profile not found', 404); return normalize(row); }
function profileInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['name', 'phone', 'availability'].includes(key))) fail('Only name, phone and availability can be updated');
  const data = {};
  if ('name' in input) { const name = String(input.name || '').trim(); if (name.length < 2 || name.length > 100) fail('Name must contain 2 to 100 characters'); data.name = name; }
  if ('phone' in input) { const phone = String(input.phone || '').replace(/[\s()-]/g, ''); if (phone && !/^\d{10}$/.test(phone)) fail('Phone number must contain 10 digits'); data.phone = phone || null; }
  if ('availability' in input) { const availability = String(input.availability || '').trim(); if (!availability || availability.length > 250) fail('Availability must contain 1 to 250 characters'); data.availability = availability; }
  if (!Object.keys(data).length) fail('Provide profile details to update'); return data;
}
async function updateProfile(userId, input) { const data = profileInput(input); try { await prisma.$transaction(async tx => { if ('name' in data || 'phone' in data) await tx.user.update({ where: { id: userId }, data: { ...('name' in data && { name: data.name }), ...('phone' in data && { phone: data.phone }) } }); if ('availability' in data) await tx.tutor.update({ where: { userId }, data: { availability: data.availability } }); }); return getProfile(userId); } catch (error) { if (error.code === 'P2002') fail('This phone number is already used by another account', 409); if (error.code === 'P2025') fail('Tutor profile not found', 404); throw error; } }
async function saveSettings(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some(key => !['avatar', 'notificationPreferences', 'themePreference'].includes(key))) fail('Invalid settings');
  const data = {};
  if ('avatar' in input) { if (input.avatar !== null && (typeof input.avatar !== 'string' || input.avatar.length > 180000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.avatar))) fail('Choose a PNG, JPEG or WebP image under 130 KB'); data.avatar = input.avatar; }
  if ('notificationPreferences' in input) { const p = input.notificationPreferences, keys = ['schedule', 'assignments', 'attendance', 'updates']; if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).length !== keys.length || keys.some(key => typeof p[key] !== 'boolean')) fail('Provide all tutor notification preferences'); data.notificationPreferences = p; }
  if ('themePreference' in input) { const theme = String(input.themePreference || '').toUpperCase(); if (!['LIGHT', 'DARK', 'SYSTEM'].includes(theme)) fail('Theme preference must be Light, Dark or System'); data.themePreference = theme; }
  await prisma.user.update({ where: { id: userId }, data }); return getProfile(userId);
}
module.exports = { getProfile, updateProfile, saveSettings, profileInput, sessions: sessionService.sessions, revokeSession: sessionService.revokeSession };
