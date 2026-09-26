const service = require("../services/academicSessionService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "An academic session with this name already exists";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const sessions = await service.list();
    res.status(200).json({ success: true, data: { sessions } });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const session = await service.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Academic session not found" });
    return res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    return sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const session = await service.create(req.body);
    res.status(201).json({ success: true, message: "Academic session created", data: { session } });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const session = await service.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Academic session updated", data: { session } });
  } catch (error) {
    sendError(next, error);
  }
}

async function activate(req, res, next) {
  try {
    const session = await service.setStatus(req.params.id, "ACTIVE");
    res.status(200).json({ success: true, message: "Academic session activated", data: { session } });
  } catch (error) {
    sendError(next, error);
  }
}

async function archive(req, res, next) {
  try {
    const session = await service.setStatus(req.params.id, "ARCHIVED");
    res.status(200).json({ success: true, message: "Academic session archived", data: { session } });
  } catch (error) {
    sendError(next, error);
  }
}

module.exports = { list, getById, create, update, activate, archive };
