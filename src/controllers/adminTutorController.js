const tutorService = require("../services/admins/adminTutorService");

function sendError(next, error) {
  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ") : String(error.meta?.target || "");
    error.statusCode = 409;
    if (target.includes("email")) error.message = "A user with this email already exists";
    else if (target.includes("phone")) error.message = "A user with this phone number already exists";
    else if (target.includes("employeeCode")) error.message = "A tutor with this employee code already exists";
    else error.message = "Duplicate tutor information is not allowed";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const tutors = await tutorService.listTutors(req.query);

    res.status(200).json({
      success: true,
      data: tutors,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const tutor = await tutorService.getTutorById(req.params.id);

    res.status(200).json({
      success: true,
      data: tutor,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const tutor = await tutorService.createTutor(req.body);

    res.status(201).json({
      success: true,
      message: "Tutor created successfully",
      data: tutor,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const tutor = await tutorService.updateTutor(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Tutor updated successfully",
      data: tutor,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function remove(req, res, next) {
  try {
    await tutorService.deleteTutor(req.params.id);

    res.status(200).json({
      success: true,
      message: "Tutor deleted successfully",
    });
  } catch (error) {
    sendError(next, error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
