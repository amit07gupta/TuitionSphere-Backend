const service = require('../services/admins/adminNoticeService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.listNotices(req.query) }); } catch (error) { next(error); } }
async function getById(req, res, next) { try { res.json({ success: true, data: await service.getNoticeById(req.params.id) }); } catch (error) { next(error); } }
async function create(req, res, next) { try { res.status(201).json({ success: true, message: 'Notice created successfully', data: await service.createNotice(req.body, req.user.id) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, message: 'Notice updated successfully', data: await service.updateNotice(req.params.id, req.body, req.user.id) }); } catch (error) { next(error); } }
async function archive(req, res, next) { try { res.json({ success: true, message: 'Notice archived successfully', data: await service.archiveNotice(req.params.id, req.user.id) }); } catch (error) { next(error); } }
module.exports = { list, getById, create, update, archive };
