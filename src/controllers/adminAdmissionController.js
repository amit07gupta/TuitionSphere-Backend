const service = require("../services/admins/adminAdmissionService");

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listAdmissions(req.query) }); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getAdmission(req.params.id) }); }
  catch (error) { next(error); }
}

async function create(req, res, next) {
  try {
    const data = await service.createAdmission(req.body);
    res.status(201).json({ success: true, message: "Student account and admission created successfully", data });
  } catch (error) { next(error); }
}

module.exports = { list, getById, create };
