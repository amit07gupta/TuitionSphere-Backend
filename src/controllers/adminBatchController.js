const batchService = require("../services/admins/adminBatchService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "A batch with this name already exists in the academic session";
  }
  if (error.code === "P2003") {
    error.statusCode = 409;
    error.message = "This batch is in use and cannot be deleted";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    const batches = await batchService.listBatches(req.query);
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    sendError(next, error);
  }
}

async function getById(req, res, next) {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    res.status(200).json({ success: true, data: batch });
  } catch (error) {
    sendError(next, error);
  }
}

async function create(req, res, next) {
  try {
    const batch = await batchService.createBatch(req.body);
    res.status(201).json({ success: true, message: "Batch created successfully", data: batch });
  } catch (error) {
    sendError(next, error);
  }
}

async function update(req, res, next) {
  try {
    const batch = await batchService.updateBatch(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Batch updated successfully", data: batch });
  } catch (error) {
    sendError(next, error);
  }
}

async function remove(req, res, next) {
  try {
    await batchService.deleteBatch(req.params.id);
    res.status(200).json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    sendError(next, error);
  }
}

module.exports = { list, getById, create, update, remove };
