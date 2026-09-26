const express = require('express');
const controller = require('../controllers/tutorAttendanceController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const router = express.Router();
router.use(authenticate, authorize('TUTOR'));
router.get('/', controller.list);
router.put('/', controller.save);
module.exports = router;
