const service = require('../services/tutors/tutorAssignmentService');
async function list(req, res, next) { try { res.json({ success: true, data: await service.list(req.user.id, req.query) }); } catch (e) { next(e); } }
async function getById(req, res, next) { try { res.json({ success: true, data: await service.detail(req.user.id, req.params.id) }); } catch (e) { next(e); } }
async function submissions(req, res, next) { try { res.json({ success: true, data: await service.submissionRoster(req.user.id, req.params.id) }); } catch (e) { next(e); } }
async function submissionFile(req, res, next) { try { res.json({ success: true, data: await service.submissionFile(req.user.id, req.params.id, req.params.submissionId) }); } catch (e) { next(e); } }
async function create(req, res, next) { try { res.status(201).json({ success: true, message: 'Assignment created successfully', data: await service.create(req.user.id, req.body) }); } catch (e) { next(e); } }
async function update(req, res, next) { try { res.json({ success: true, message: 'Assignment updated successfully', data: await service.update(req.user.id, req.params.id, req.body) }); } catch (e) { next(e); } }
async function updateArchive(req, res, next) { try { res.json({ success: true, message: 'Assignment status updated', data: await service.updateArchive(req.user.id, req.params.id, req.body) }); } catch (e) { next(e); } }
async function review(req, res, next) { try { res.json({ success: true, message: 'Submission reviewed successfully', data: await service.reviewSubmission(req.user.id, req.params.id, req.params.submissionId, req.body) }); } catch (e) { next(e); } }
module.exports = { list, getById, submissions, submissionFile, create, update, updateArchive, review };
