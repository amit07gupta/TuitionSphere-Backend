const router = require('express').Router();
const controller = require('../controllers/studentAttendanceController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.list);
router.post('/leave-requests', controller.create);
router.patch('/leave-requests/:id', controller.update);
router.patch('/leave-requests/:id/cancel', controller.cancel);
module.exports = router;
