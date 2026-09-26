const express = require("express");
const controller = require("../controllers/inquiryController");
const router = express.Router();
router.post("/", controller.create);
module.exports = router;
