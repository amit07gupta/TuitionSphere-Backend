const service = require("../services/admins/adminDemoSetupService");

function sendError(next, error) {
  if (error.code === "P2002") {
    error.statusCode = 409;
    error.message = "A demo setup with this name already exists in the academic session";
  }
  if (error.code === "P2003") {
    error.statusCode = 409;
    error.message = "This demo setup is in use and cannot be deleted";
  }
  next(error);
}

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listDemoSetups(req.query) }); }
  catch (error) { sendError(next, error); }
}
async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getDemoSetupById(req.params.id) }); }
  catch (error) { sendError(next, error); }
}
async function create(req, res, next) {
  try {
    const setup = await service.createDemoSetup(req.body);
    res.status(201).json({ success: true, message: "Demo setup created successfully", data: setup });
  } catch (error) { sendError(next, error); }
}
async function update(req, res, next) {
  try {
    const setup = await service.updateDemoSetup(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Demo setup updated successfully", data: setup });
  } catch (error) { sendError(next, error); }
}
async function remove(req, res, next) {
  try {
    await service.deleteDemoSetup(req.params.id);
    res.status(200).json({ success: true, message: "Demo setup deleted successfully" });
  } catch (error) { sendError(next, error); }
}

module.exports = { list, getById, create, update, remove };
