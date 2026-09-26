const prisma = require('../../config/prisma');
const fields = { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, lastLoginAt: true, avatar: true, notificationPreferences: true, themePreference: true };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Profile details are required');
  if (Object.keys(input).some(key => !['name', 'phone'].includes(key))) fail('Only name and phone can be updated');
  const data = {};
  if ('name' in input) {
    if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 100) fail('Name must contain 2 to 100 characters');
    data.name = input.name.trim();
  }
  if ('phone' in input) {
    if (input.phone !== null && typeof input.phone !== 'string') fail('Enter a valid phone number');
    data.phone = (input.phone || '').replace(/[\s()-]/g, '') || null;
    if (data.phone && !/^\d{10}$/.test(data.phone)) fail('Phone number must contain 10 digits');
  }
  if (!Object.keys(data).length) fail('Provide a name or phone to update');
  return data;
}
async function getProfile(id) {
  const profile = await prisma.user.findUnique({ where: { id }, select: fields });
  if (!profile) fail('Profile not found', 404);
  return profile;
}
async function updateProfile(id, input) {
  const data = validateInput(input);
  try { return await prisma.user.update({ where: { id }, data, select: fields }); }
  catch (error) {
    if (error.code === 'P2002') fail('This phone number is already used by another account', 409);
    if (error.code === 'P2025') fail('Profile not found', 404);
    throw error;
  }
}
async function saveSettings(id, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length || Object.keys(input).some(key => !['avatar', 'notificationPreferences', 'themePreference'].includes(key))) fail('Invalid settings');
  const data = {};
  if ('avatar' in input) {
    if (input.avatar !== null && (typeof input.avatar !== 'string' || input.avatar.length > 180000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.avatar))) fail('Choose a PNG, JPEG or WebP image under 130 KB');
    data.avatar = input.avatar;
  }
  if ('notificationPreferences' in input) {
    const prefs = input.notificationPreferences;
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs) || Object.keys(prefs).some(key => !['admissions', 'fees', 'academics'].includes(key) || typeof prefs[key] !== 'boolean')) fail('Invalid notification preferences');
    if (Object.keys(prefs).length !== 3) fail('Provide all notification preferences');
    data.notificationPreferences = prefs;
  }
  if ('themePreference' in input) {
    const theme = String(input.themePreference || '').toUpperCase();
    if (!['LIGHT', 'DARK', 'SYSTEM'].includes(theme)) fail('Theme preference must be Light, Dark or System');
    data.themePreference = theme;
  }
  return prisma.user.update({ where: { id }, data, select: fields });
}
async function sessions(user) {
  const rows = await prisma.adminSession.findMany({ where: { userId: user.id, sessionVersion: user.sessionVersion, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userAgent: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
  return { trackedCurrentSession: Boolean(user.sessionId), sessions: rows.map(row => ({ ...row, current: row.id === user.sessionId })) };
}
async function revokeSession(user, id) {
  const result = await prisma.adminSession.updateMany({ where: { id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) fail('Session not found', 404);
}
module.exports = { getProfile, updateProfile, validateInput, saveSettings, sessions, revokeSession };
