const router = require('express').Router();
const controller = require('../controllers/studentScheduleController');

router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.list);

module.exports = router;
