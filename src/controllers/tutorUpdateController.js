const service = require('../services/tutors/tutorUpdateService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.list(req.user.id, req.query) }); } catch (error) { next(error); } }
async function create(req, res, next) { try { res.status(201).json({ success: true, data: await service.create(req.user.id, req.body) }); } catch (error) { next(error); } }
async function update(req, res, next) { try { res.json({ success: true, data: await service.update(req.user.id, req.params.id, req.body) }); } catch (error) { next(error); } }
async function archive(req, res, next) { try { res.json({ success: true, data: await service.archive(req.user.id, req.params.id) }); } catch (error) { next(error); } }
module.exports = { list, create, update, archive };
