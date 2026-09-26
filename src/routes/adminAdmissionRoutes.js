const express = require("express");
const controller = require("../controllers/adminAdmissionController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);

module.exports = router;
