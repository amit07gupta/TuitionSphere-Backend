const express = require("express");
const controller = require("../controllers/adminInvoiceController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", controller.list);
router.post("/generate", controller.generate);
router.patch('/payment-reports/:reportId/review', controller.reviewReport);
router.get('/payment-reports/:reportId/proof', controller.reportProof);
router.get("/:id", controller.getById);
router.post("/:id/payments", controller.recordPayment);

module.exports = router;
