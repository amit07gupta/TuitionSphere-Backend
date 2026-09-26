const service = require('../services/students/studentAttendanceService');

async function list(req, res, next) {
  try { res.json({ success: true, data: await service.context(req.user.id) }); }
  catch (error) { next(error); }
}
async function create(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.createLeave(req.user.id, req.body) }); }
  catch (error) { next(error); }
}
async function update(req, res, next) {
  try { res.json({ success: true, data: await service.updateLeave(req.user.id, req.params.id, req.body) }); }
  catch (error) { next(error); }
}
async function cancel(req, res, next) {
  try { res.json({ success: true, data: await service.cancelLeave(req.user.id, req.params.id) }); }
  catch (error) { next(error); }
}
module.exports = { list, create, update, cancel };
