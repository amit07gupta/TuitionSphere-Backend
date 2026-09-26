const router = require('express').Router();
const controller = require('../controllers/studentAssignmentController');

router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.list);
router.get('/:id', controller.detail);
router.post('/:id/submission', controller.submit);

module.exports = router;
