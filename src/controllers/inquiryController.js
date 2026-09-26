const service = require("../services/inquiryService");
async function create(req, res, next) { try { res.status(201).json({ success: true, message: "Inquiry submitted successfully", data: await service.createInquiry(req.body) }); } catch (error) { next(error); } }
async function list(req, res, next) { try { res.json({ success: true, data: await service.listInquiries(req.query) }); } catch (error) { next(error); } }
async function getById(req, res, next) { try { res.json({ success: true, data: await service.getInquiry(req.params.id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, message: "Inquiry updated", data: await service.updateInquiry(req.params.id, req.body) }); } catch (error) { next(error); } }
module.exports = { create, list, getById, update };
