const service = require('../services/admins/adminUserService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.listAdminUsers(req.query, req.user.id) }); } catch (error) { next(error); } }
async function getById(req, res, next) { try { res.json({ success: true, data: await service.getAdminById(req.params.id, req.user.id) }); } catch (error) { next(error); } }
async function create(req, res, next) { try { res.status(201).json({ success: true, message: 'Administrator created successfully', data: await service.createAdmin(req.body, req.user.id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, message: 'Administrator updated successfully', data: await service.updateAdmin(req.params.id, req.body, req.user.id) }); } catch (error) { next(error); } }
async function updateStatus(req, res, next) { try { res.json({ success: true, message: 'Administrator status updated successfully', data: await service.updateStatus(req.params.id, req.body, req.user.id) }); } catch (error) { next(error); } }
module.exports = { list, getById, create, update, updateStatus };
