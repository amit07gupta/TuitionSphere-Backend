const service = require("../services/admins/adminClassScheduleService");

async function list(req, res, next) { try { res.json({ success: true, data: await service.listClassSchedules(req.query) }); } catch (error) { next(error); } }
async function getById(req, res, next) { try { res.json({ success: true, data: await service.getClassScheduleById(req.params.id) }); } catch (error) { next(error); } }
async function create(req, res, next) { try { res.status(201).json({ success: true, message: "Class schedule created successfully", data: await service.createClassSchedule(req.body) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, message: "Class schedule updated successfully", data: await service.updateClassSchedule(req.params.id, req.body) }); } catch (error) { next(error); } }
async function cancel(req, res, next) { try { res.json({ success: true, message: "Class schedule cancelled successfully", data: await service.cancelClassSchedule(req.params.id) }); } catch (error) { next(error); } }

module.exports = { list, getById, create, update, cancel };
