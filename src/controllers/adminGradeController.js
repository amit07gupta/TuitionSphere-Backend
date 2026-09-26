const gradeService = require("../services/admins/adminGradeService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "A grade with this numeric value already exists";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const grades = await gradeService.listGrades();

    res.status(200).json({
      success: true,
      data: grades,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const grade = await gradeService.createGrade(req.body);

    res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: grade,
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const grade = await gradeService.getGradeById(req.params.id);
    res.status(200).json({ success: true, data: grade });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Grade updated successfully", data: grade });
  } catch (error) {
    sendError(next, error);
  }
}

async function remove(req, res, next) {
  try {
    await gradeService.deleteGrade(req.params.id);
    res.status(200).json({ success: true, message: "Grade deleted successfully" });
  } catch (error) {
    sendError(next, error);
  }
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
};
