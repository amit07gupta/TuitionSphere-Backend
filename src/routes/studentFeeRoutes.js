const router = require('express').Router();
const controller = require('../controllers/studentFeeController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.list);
router.post('/:id/payment-reports', controller.submit);
module.exports = router;
