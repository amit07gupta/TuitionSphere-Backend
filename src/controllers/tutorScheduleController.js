const service = require("../services/tutors/tutorScheduleService");

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await service.getTutorScheduleContext(req.user.id, req.query) });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
