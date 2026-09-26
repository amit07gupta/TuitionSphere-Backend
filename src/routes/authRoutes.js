const express = require("express");

const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");

const authorize = require("../middleware/authorize");
const router = express.Router();

router.post("/login", authController.login);
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

router.post("/change-password", authenticate, authorize("ADMIN", "SUPER_ADMIN", "TUTOR"), authController.changePassword);

module.exports = router;
