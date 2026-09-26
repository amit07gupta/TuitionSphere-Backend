const service = require("../services/tutors/tutorStudentService");

async function list(req, res, next) {
  try {
    res.json({ success: true, data: await service.getTutorStudents(req.user.id, req.query) });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
