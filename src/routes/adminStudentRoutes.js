const express = require("express");
const controller = require("../controllers/adminStudentController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.get("/:id/overview", controller.overview);
router.get("/:id/profile-requests", controller.profileRequests);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);
router.patch("/:id/batch", controller.transfer);

module.exports = router;
