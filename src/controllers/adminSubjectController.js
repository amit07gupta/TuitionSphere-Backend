const subjectService = require("../services/admins/adminSubjectService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "This subject code already exists for the selected board";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const subjects = await subjectService.listSubjects(req.query);
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json({ success: true, message: "Subject created successfully", data: subject });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Subject updated successfully", data: subject });
  } catch (error) {
    sendError(next, error);
  }
}

async function remove(req, res, next) {
  try {
    await subjectService.deleteSubject(req.params.id);
    res.status(200).json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    sendError(next, error);
  }
}

module.exports = { list, getById, create, update, remove };
