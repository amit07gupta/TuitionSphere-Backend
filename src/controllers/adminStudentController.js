const service = require("../services/admins/adminStudentService");

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listStudents(req.query) }); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getStudent(req.params.id) }); }
  catch (error) { next(error); }
}

async function update(req, res, next) {
  try { res.status(200).json({ success: true, message: "Student updated successfully", data: await service.updateStudent(req.params.id, req.body) }); }
  catch (error) { next(error); }
}

async function transfer(req, res, next) {
  try { res.status(200).json({ success: true, message: "Student batch updated successfully", data: await service.transferStudent(req.params.id, req.body) }); }
  catch (error) { next(error); }
}

async function overview(req, res, next) {
  try { res.json({ success: true, data: await require('../services/admins/adminStudentOverviewService').overview(req.params.id) }); }
  catch (error) { next(error); }
}
async function profileRequests(req, res, next) {
  try { res.json({ success: true, data: await service.listProfileRequests(req.params.id) }); }
  catch (error) { next(error); }
}
module.exports = { list, getById, update, transfer, overview, profileRequests };
