const service = require('../services/admins/adminDashboardService');
async function overview(req, res, next) {
  try { return res.json({ success: true, data: await service.overview(req.query) }); }
  catch (error) { return next(error); }
}
module.exports = { overview };
