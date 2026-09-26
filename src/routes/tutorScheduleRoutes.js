const express = require("express");
const controller = require("../controllers/tutorScheduleController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("TUTOR"));
router.get("/", controller.list);

module.exports = router;
