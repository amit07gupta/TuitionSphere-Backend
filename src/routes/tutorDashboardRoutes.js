const router = require('express').Router();
const controller = require('../controllers/tutorDashboardController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('TUTOR'));
router.get('/', controller.get);
module.exports = router;
