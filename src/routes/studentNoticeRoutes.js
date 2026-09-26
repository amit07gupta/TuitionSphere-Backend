const router = require('express').Router();
const controller = require('../controllers/studentNoticeController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.list);
router.post('/read-all', controller.markAllRead);
module.exports = router;
