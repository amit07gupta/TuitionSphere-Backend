const service = require("../services/admins/adminBoardService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "A board with this code already exists";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const boards = await service.list();
    res.status(200).json({ success: true, data: { boards } });
  } catch (error) {
    sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const board = await service.create(req.body);
    res.status(201).json({
      success: true,
      message: "Board created successfully",
      data: { board },
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const board = await service.getById(req.params.id);
    res.status(200).json({ success: true, data: { board } });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const board = await service.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Board updated successfully",
      data: { board },
    });
  } catch (error) {
    sendError(next, error);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(200).json({ success: true, message: "Board deleted successfully" });
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
