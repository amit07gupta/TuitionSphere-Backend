const service = require('../services/students/studentProfileService');
async function get(req, res, next) { try { res.json({ success: true, data: await service.getProfile(req.user.id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, message: 'Profile updated', data: await service.updateProfile(req.user.id, req.body) }); } catch (error) { next(error); } }
async function photo(req, res, next) { try { res.json({ success: true, message: 'Profile photo updated', data: await service.updatePhoto(req.user.id, req.body) }); } catch (error) { next(error); } }
async function theme(req, res, next) { try { res.json({ success: true, message: 'Theme updated', data: await service.updateTheme(req.user.id, req.body) }); } catch (error) { next(error); } }
async function correction(req, res, next) { try { res.status(201).json({ success: true, message: 'Correction request submitted', data: await service.createCorrectionRequest(req.user.id, req.body) }); } catch (error) { next(error); } }
module.exports = { get, update, photo, theme, correction };
