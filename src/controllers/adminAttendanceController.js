const service = require("../services/admins/adminAttendanceService");

async function list(req, res, next) {
  try { res.json({ success: true, data: await service.context(req.query) }); }
  catch (error) { next(error); }
}

async function save(req, res, next) {
  try { res.json({ success: true, message: "Attendance updated successfully", data: await service.save(req.body, req.user.id) }); }
  catch (error) { next(error); }
}

async function reviewLeave(req, res, next) {
  try { res.json({ success: true, message: "Attendance updated successfully", data: await service.review(req.params.id, req.body, req.user.id) }); }
  catch (error) { next(error); }
}

module.exports = { list, save, reviewLeave };
