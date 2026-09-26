const express = require("express");
const controller = require("../controllers/adminAssignmentController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch("/:id/archive", controller.updateArchive);

module.exports = router;
