const express = require("express");
const {
  getPendingKYC,
  getLiveAuction,
  getPendingPayments,
} = require("../controllers/adminContentController");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

router.get("/kyc/pending", getPendingKYC);
router.get("/auctions/live", getLiveAuction);
router.get("/payments/pending", getPendingPayments);

module.exports = router;
