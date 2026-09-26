const service = require("../services/admins/adminDemoSetupService");

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listPublicDemoSetups() }); }
  catch (error) { next(error); }
}

module.exports = { list };
