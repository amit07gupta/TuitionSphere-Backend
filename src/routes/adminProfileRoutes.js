const router = require('express').Router();
const controller = require('../controllers/adminProfileController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('ADMIN', 'SUPER_ADMIN'));
router.get('/', controller.get);
router.patch('/', controller.update);
router.patch('/settings', controller.settings);
router.get('/sessions', controller.sessions);
router.delete('/sessions/:id', controller.revokeSession);
module.exports = router;
