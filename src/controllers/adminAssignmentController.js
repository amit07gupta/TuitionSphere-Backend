const service = require("../services/admins/adminAssignmentService");

async function list(req, res, next) {
  try { res.json({ success: true, data: await service.list(req.query) }); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.json({ success: true, data: await service.detail(req.params.id) }); }
  catch (error) { next(error); }
}

async function updateArchive(req, res, next) {
  try { res.json({ success: true, message: "Assignment updated successfully", data: await service.updateArchive(req.params.id, req.body, req.user.id) }); }
  catch (error) { next(error); }
}

module.exports = { list, getById, updateArchive };
