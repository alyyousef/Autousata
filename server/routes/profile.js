const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { upload } = require("../middleware/uploadMiddleware"); // Need 'upload' for file parsing
const activityLogger = require("../middleware/activityLogger");
const rekognitionService = require("../services/rekognitionService");

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

// ==========================================
// IDENTITY VERIFICATION (AI)
// ==========================================
// 1. Verify Identity (Final Step: Face Match + Data Extraction)
router.post("/verify-identity", authenticate, userController.verifyIdentity);

// 2. Validate ID Step (Controller based, expects idImage)
router.post("/validate-id", authenticate, userController.validateIDStep);

// 3. Validate Document Only (Inline handler for frontend generic check)
// This supports the "validateDocumentOnly" function in your frontend API
router.post("/validate-document", async (req, res) => {
  try {
    const { image } = req.body; // Expects Base64 string

    if (!image) return res.status(400).json({ error: "No image provided" });

    // Convert Base64 to Buffer
    const buffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );

    // Run your STRICT Model Check (Rekognition)
    await rekognitionService.validateDocument(buffer);

    // If it doesn't throw an error, it passed!
    res.json({ success: true, message: "ID Accepted" });
  } catch (error) {
    console.error("ID Check Failed:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
