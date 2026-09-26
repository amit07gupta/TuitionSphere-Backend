const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { buildAdminUserFilters, enumValue, roles, statuses } = require('./adminUserFilterService');
const publicFields = { id: true, name: true, email: true, phone: true, role: true, status: true, lastLoginAt: true, createdAt: true, updatedAt: true };
function fail(message, statusCode = 400) { throw Object.assign(new Error(message), { statusCode }); }
function validateInput(input = {}, creating = false) {
  if (!input || typeof input !== 'object') fail('Admin details are required');
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phoneText = String(input.phone || '').trim();
  const phone = phoneText.replace(/[\s()-]/g, '') || null;
  if (name.length < 2 || name.length > 100) fail('Name must contain 2 to 100 characters');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address');
  if (phone && !/^\d{10}$/.test(phone)) fail('Phone number must contain 10 digits');
  const role = enumValue(input.role, roles, 'admin role');
  const status = enumValue(input.status, statuses, 'account status');
  if (creating) {
    if (typeof input.password !== 'string' || input.password.length < 8 || Buffer.byteLength(input.password, 'utf8') > 72 || !input.password.trim()) fail('Initial password must have at least 8 characters and at most 72 UTF-8 bytes');
  } else if (input.password) fail('Password changes are not supported through account editing');
  return { name, email, phone, role, status };
}
async function requireSuperAdmin(tx, actorId) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, status: true } });
  if (!actor || actor.role !== 'SUPER_ADMIN' || actor.status !== 'ACTIVE') fail('Only an active Super Admin can manage administrator accounts', 403);
}
async function getAdmin(tx, id) {
  const user = await tx.user.findFirst({ where: { id, role: { in: roles } }, select: publicFields });
  if (!user) fail('Administrator not found', 404);
  return user;
}
async function uniqueContact(tx, data, id) {
  const OR = [{ email: { equals: data.email, mode: 'insensitive' } }];
  if (data.phone) OR.push({ phone: data.phone });
  const match = await tx.user.findFirst({ where: { ...(id ? { id: { not: id } } : {}), OR }, select: { id: true } });
  if (match) fail('An account already uses this email or phone number', 409);
}
async function protectAccess(tx, existing, data, actorId) {
  if (existing.id === actorId && (data.status !== 'ACTIVE' || data.role !== 'SUPER_ADMIN')) fail('You cannot deactivate, block or demote the Super Admin account currently in use', 409);
  if (existing.role === 'SUPER_ADMIN' && existing.status === 'ACTIVE' && (data.role !== 'SUPER_ADMIN' || data.status !== 'ACTIVE')) {
    const others = await tx.user.count({ where: { id: { not: existing.id }, role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    if (!others) fail('At least one active Super Admin account is required', 409);
  }
}
async function transaction(action) {
  try { return await prisma.$transaction(action, { isolationLevel: 'Serializable', timeout: 15000 }); }
  catch (error) {
    if (error.code === 'P2002') fail('An account already uses this email or phone number', 409);
    if (error.code === 'P2034') fail('Administrator access changed during this request. Refresh and try again.', 409);
    throw error;
  }
}
async function listAdminUsers(query, actorId) {
  await requireSuperAdmin(prisma, actorId);
  return prisma.user.findMany({ where: buildAdminUserFilters(query), select: publicFields, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
}
async function getAdminById(id, actorId) { await requireSuperAdmin(prisma, actorId); return getAdmin(prisma, id); }
async function createAdmin(input, actorId) {
  const data = validateInput(input, true);
  await requireSuperAdmin(prisma, actorId);
  const passwordHash = await bcrypt.hash(input.password, 12);
  return transaction(async (tx) => {
    await requireSuperAdmin(tx, actorId); await uniqueContact(tx, data);
    return tx.user.create({ data: { ...data, passwordHash }, select: publicFields });
  });
}
async function updateAdmin(id, input, actorId) {
  const data = validateInput(input);
  return transaction(async (tx) => {
    await requireSuperAdmin(tx, actorId);
    const existing = await getAdmin(tx, id);
    await protectAccess(tx, existing, data, actorId); await uniqueContact(tx, data, id);
    return tx.user.update({ where: { id }, data, select: publicFields });
  });
}
async function updateStatus(id, input = {}, actorId) {
  const status = enumValue(input?.status, statuses, 'account status');
  return transaction(async (tx) => {
    await requireSuperAdmin(tx, actorId);
    const existing = await getAdmin(tx, id);
    await protectAccess(tx, existing, { ...existing, status }, actorId);
    return tx.user.update({ where: { id }, data: { status }, select: publicFields });
  });
}
module.exports = { listAdminUsers, getAdminById, createAdmin, updateAdmin, updateStatus, validateInput, protectAccess };
