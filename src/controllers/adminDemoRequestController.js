const service = require("../services/admins/adminDemoRequestService");

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listDemoRequests(req.query) }); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getDemoRequest(req.params.id) }); }
  catch (error) { next(error); }
}

async function updateStatus(req, res, next) {
  try {
    const data = await service.updateStatus(req.params.id, req.body.status);
    res.status(200).json({ success: true, message: "Demo request status updated", data });
  } catch (error) { next(error); }
}

module.exports = { list, getById, updateStatus };
