const service = require('../services/students/studentFeeService');

async function list(req, res, next) {
  try { res.json({ success: true, data: await service.list(req.user.id) }); } catch (error) { next(error); }
}
async function submit(req, res, next) {
  try { res.status(201).json({ success: true, message: 'Payment submitted for verification', data: await service.submit(req.user.id, req.params.id, req.body) }); }
  catch (error) { next(error); }
}
module.exports = { list, submit };
