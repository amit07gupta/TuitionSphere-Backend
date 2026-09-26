const service = require('../services/admins/adminProfileService');
async function get(req, res, next) {
  try { res.json({ success: true, data: await service.getProfile(req.user.id) }); } catch (error) { next(error); }
}
async function update(req, res, next) {
  try { res.json({ success: true, message: 'Profile updated successfully', data: await service.updateProfile(req.user.id, req.body) }); } catch (error) { next(error); }
}
async function settings(req, res, next) { try { res.json({ success: true, data: await service.saveSettings(req.user.id, req.body) }); } catch (error) { next(error); } }
async function sessions(req, res, next) { try { res.json({ success: true, data: await service.sessions(req.user) }); } catch (error) { next(error); } }
async function revokeSession(req, res, next) { try { await service.revokeSession(req.user, req.params.id); res.json({ success: true, message: 'Session signed out' }); } catch (error) { next(error); } }
module.exports = { get, update, settings, sessions, revokeSession };
