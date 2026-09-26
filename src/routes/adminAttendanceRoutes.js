const express = require("express");
const controller = require("../controllers/adminAttendanceController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.put("/", controller.save);
router.patch("/leave-requests/:id/review", controller.reviewLeave);

module.exports = router;
