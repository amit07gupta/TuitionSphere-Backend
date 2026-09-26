const service = require('../services/tutors/tutorAttendanceService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.context(req.user.id, req.query) }); } catch (error) { next(error); } }
async function save(req, res, next) { try { res.json({ success: true, message: 'Attendance saved successfully', data: await service.save(req.user.id, req.body) }); } catch (error) { next(error); } }
module.exports = { list, save };
