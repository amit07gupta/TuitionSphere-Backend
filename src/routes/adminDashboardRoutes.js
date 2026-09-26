const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const controller = require('../controllers/adminDashboardController');
router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));
router.get('/', controller.overview);
module.exports = router;
