const service = require("../services/publicDemoRequestService");

async function create(req, res, next) {
  try {
    const data = await service.createDemoRequest(req.body);
    res.status(201).json({ success: true, message: "Demo request submitted successfully", data });
  } catch (error) {
    next(error);
  }
}

module.exports = { create };
