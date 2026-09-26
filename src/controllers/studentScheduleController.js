const service = require('../services/students/studentScheduleService');

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await service.getStudentSchedule(req.user.id) });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
