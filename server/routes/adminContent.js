const express = require("express");
const {
  getPendingKYC,
  getAllAuction,
  getPendingPayments,
  updateAuction,
  setAuctionStartTime,
  filterAuctions,
  searchAuctionsController,
  getAuctionController,
  updateKYCcontroller,
  searchKYCController,
  filterKYCByStatusController,
  viewKYCDetailsController,
  viewUserController,
  getalluserskycController,
} = require("../controllers/adminContentController");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

router.get("/kyc", authenticate, authorize("admin"), getalluserskycController);
router.get(
  "/payments/pending",
  authenticate,
  authorize("admin"),
  getPendingPayments,
);

//auctions
router.get("/auctions", authenticate, authorize("admin"), getAllAuction);
router.patch(
  "/auctions/:auctionId/status",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "AUCTION_STATUS_UPDATE",
    severity: "INFO",
    entityType: "AUCTION",
    getEntityId: (req) => req.params.auctionId,
    getDescription: (req) =>
      `Admin updated auction status ${req.params.auctionId}`,
  }),
  updateAuction,
);
router.patch(
  "/auctions/:auctionId/start-time",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "AUCTION_SET_START_TIME",
    severity: "INFO",
    entityType: "AUCTION",
    getEntityId: (req) => req.params.auctionId,
    getDescription: (req) =>
      `Admin set start time for auction ${req.params.auctionId}`,
  }),
  setAuctionStartTime,
);
router.get(
  "/auctions/filter",
  authenticate,
  authorize("admin"),
  filterAuctions,
);
router.get(
  "/auctions/search",
  authenticate,
  authorize("admin"),
  searchAuctionsController,
);
router.get(
  "/auctions/:auctionId",
  authenticate,
  authorize("admin"),
  getAuctionController,
);
router.patch(
  "/kyc/:userId/status",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "KYC_STATUS_UPDATE",
    severity: "INFO",
    entityType: "USER",
    getEntityId: (req) => req.params.userId,
    getDescription: (req) => `Admin updated KYC for user ${req.params.userId}`,
  }),
  updateKYCcontroller,
);
router.get(
  "/kyc/search",
  authenticate,
  authorize("admin"),
  searchKYCController,
);
router.get(
  "/kyc/filter",
  authenticate,
  authorize("admin"),
  filterKYCByStatusController,
);
router.get(
  "/kyc/:kycId",
  authenticate,
  authorize("admin"),
  viewKYCDetailsController,
);
router.get(
  "/users/:userId",
  authenticate,
  authorize("admin"),
  viewUserController,
);

module.exports = router;
