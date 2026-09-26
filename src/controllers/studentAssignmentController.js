const service = require('../services/students/studentAssignmentService');

async function list(req, res, next) {
  try { res.json({ success: true, data: await service.list(req.user.id) }); }
  catch (error) { next(error); }
}
async function detail(req, res, next) {
  try { res.json({ success: true, data: await service.detail(req.user.id, req.params.id) }); }
  catch (error) { next(error); }
}
async function submit(req, res, next) {
  try { res.status(201).json({ success: true, data: await service.submit(req.user.id, req.params.id, req.body) }); }
  catch (error) { next(error); }
}
module.exports = { list, detail, submit };
