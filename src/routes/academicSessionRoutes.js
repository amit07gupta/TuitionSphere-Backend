const express = require("express");

const controller = require("../controllers/academicSessionController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.patch("/:id/activate", controller.activate);
router.patch("/:id/archive", controller.archive);

module.exports = router;
