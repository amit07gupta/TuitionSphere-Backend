const service = require('../services/tutors/tutorDashboardService');
async function get(req, res, next) { try { res.json({ success: true, data: await service.getDashboard(req.user.id) }); } catch (error) { next(error); } }
module.exports = { get };
