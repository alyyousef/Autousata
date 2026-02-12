const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/uploadMiddleware"); // Need 'upload' for file parsing
const activityLogger = require("../middleware/activityLogger");

console.log("✅ Profile Routes Loaded");

router.put(
  "/",
  authenticate,
  activityLogger({
    action: "PROFILE_UPDATE",
    severity: "INFO",
    entityType: "USER",
    getEntityId: (req) => req.user.id,
  }),
  userController.updateProfile,
);

router.put(
  "/avatar",
  authenticate,
  upload.single("avatar"),
  activityLogger({
    action: "AVATAR_UPLOAD",
    severity: "INFO",
    entityType: "USER",
    getEntityId: (req) => req.user.id,
  }),
  userController.updateAvatar,
);

router.put(
  "/kyc",
  authenticate,
  upload.single("kycDocument"),
  activityLogger({
    action: "KYC_UPLOAD",
    severity: "WARN", // KYC is sensitive
    entityType: "USER",
    getEntityId: (req) => req.user.id,
  }),
  userController.uploadKYC,
);

router.get("/listings", authenticate, userController.sellerListingsController);
router.get("/mygarage", authenticate, userController.garageController);
module.exports = router;
