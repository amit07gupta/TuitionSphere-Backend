const service = require("../services/admins/adminInvoiceService");
const studentFeeService = require('../services/students/studentFeeService');

async function list(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.listInvoices(req.query) }); }
  catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.status(200).json({ success: true, data: await service.getInvoice(req.params.id) }); }
  catch (error) { next(error); }
}

async function generate(req, res, next) {
  try { res.status(201).json({ success: true, message: "Invoices generated successfully", data: await service.generateInvoices(req.body.admissionId) }); }
  catch (error) { next(error); }
}

async function recordPayment(req, res, next) {
  try { res.status(201).json({ success: true, message: "Payment recorded successfully", data: await service.recordPayment(req.params.id, req.body, req.user.id) }); }
  catch (error) { next(error); }
}

async function reviewReport(req, res, next) {
  try {
    const result = await studentFeeService.review(req.params.reportId, req.user.id, req.body);
    res.json({ success: true, message: 'Payment report reviewed', data: await service.getInvoice(result.invoiceId) });
  } catch (error) { next(error); }
}

async function reportProof(req, res, next) {
  try { res.json({ success: true, data: await studentFeeService.proof(req.params.reportId) }); }
  catch (error) { next(error); }
}

module.exports = { list, getById, generate, recordPayment, reviewReport, reportProof };
