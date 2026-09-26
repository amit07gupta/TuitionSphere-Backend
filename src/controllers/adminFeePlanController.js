const feePlanService = require("../services/admins/adminFeePlanService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "A fee plan already exists for this grade and academic session";
  }
  if (error.code === "P2003") {
    error.statusCode = 409;
    error.message = "This fee plan is in use and cannot be deleted";
  }
  next(error);
}

async function list(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await feePlanService.listFeePlans(req.query) });
  } catch (error) { sendError(next, error); }
}

async function getById(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await feePlanService.getFeePlanById(req.params.id) });
  } catch (error) { sendError(next, error); }
}

async function create(req, res, next) {
  try {
    const plan = await feePlanService.createFeePlan(req.body);
    res.status(201).json({ success: true, message: "Fee plan created successfully", data: plan });
  } catch (error) { sendError(next, error); }
}

async function update(req, res, next) {
  try {
    const plan = await feePlanService.updateFeePlan(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Fee plan updated successfully", data: plan });
  } catch (error) { sendError(next, error); }
}

async function remove(req, res, next) {
  try {
    await feePlanService.deleteFeePlan(req.params.id);
    res.status(200).json({ success: true, message: "Fee plan deleted successfully" });
  } catch (error) { sendError(next, error); }
}

module.exports = { list, getById, create, update, remove };
