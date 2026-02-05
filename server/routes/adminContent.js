const express = require("express");
const {
  getPendingKYC,
  getLiveAuction,
  getPendingPayments,
} = require("../controllers/adminContentController");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

router.get('/kyc/pending', authenticate,authorize("admin"), getPendingKYC);
router.get('/auctions/live', authenticate,authorize("admin"),getLiveAuction);
router.get('/payments/pending', authenticate,authorize("admin"), getPendingPayments);


module.exports = router;
