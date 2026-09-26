const router = require('express').Router();
const controller = require('../controllers/studentProfileController');
router.use(require('../middleware/authenticate'), require('../middleware/authorize')('STUDENT'));
router.get('/', controller.get);
router.patch('/', controller.update);
router.patch('/photo', controller.photo);
router.patch('/theme', controller.theme);
router.post('/correction-requests', controller.correction);
module.exports = router;
