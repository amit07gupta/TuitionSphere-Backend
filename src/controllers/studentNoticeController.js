const service = require('../services/students/studentNoticeService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.list(req.user.id) }); } catch (error) { next(error); } }
async function markAllRead(req, res, next) { try { res.json({ success: true, message: 'Updates marked as read', data: await service.markAllRead(req.user.id) }); } catch (error) { next(error); } }
module.exports = { list, markAllRead };
