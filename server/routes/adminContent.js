const express = require("express");
const {
  getPendingKYC,
  getAllAuction,
  getPendingPayments,
  updateAuction,
  setAuctionStartTime,
  filterAuctions,
  searchAuctionsController,
  getAuctionController

} = require("../controllers/adminContentController");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

router.get('/kyc/pending', authenticate,authorize("admin"), getPendingKYC);
router.get('/payments/pending', authenticate,authorize("admin"), getPendingPayments);

//auctions
router.get('/auctions', authenticate,authorize("admin"),getAllAuction);
router.patch('/auctions/:auctionId/status', authenticate,authorize("admin"), updateAuction);
router.patch('/auctions/:auctionId/start-time', authenticate,authorize("admin"), setAuctionStartTime);
router.get('/auctions/filter', authenticate,authorize("admin"), filterAuctions);
router.get('/auctions/search', authenticate,authorize("admin"), searchAuctionsController);
router.get('/auctions/:auctionId', authenticate,authorize("admin"), getAuctionController);

module.exports = router;
