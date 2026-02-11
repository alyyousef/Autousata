const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // ✅ Use userController
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const rekognitionService = require('../services/rekognitionService');

console.log('✅ Profile Routes Loaded');

// ==========================================
// PROFILE MANAGEMENT
// ==========================================
// Text Profile Update
router.put('/', authenticate, userController.updateProfile);

// Avatar Update
router.put('/avatar', authenticate, upload.single('avatar'), userController.updateAvatar);

// Old KYC Upload (File based - Legacy)
router.put('/kyc', authenticate, upload.single('kycDocument'), userController.uploadKYC);

// ==========================================
// IDENTITY VERIFICATION (AI)
// ==========================================
// 1. Verify Identity (Final Step: Face Match + Data Extraction)
router.post('/verify-identity', authenticate, userController.verifyIdentity);

// 2. Validate ID Step (Controller based, expects idImage)
router.post('/validate-id', authenticate, userController.validateIDStep);

// 3. Validate Document Only (Inline handler for frontend generic check)
// This supports the "validateDocumentOnly" function in your frontend API
router.post('/validate-document', async (req, res) => {
    try {
        const { image } = req.body; // Expects Base64 string
        
        if (!image) return res.status(400).json({ error: "No image provided" });

        // Convert Base64 to Buffer
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // Run your STRICT Model Check (Rekognition)
        await rekognitionService.validateDocument(buffer);

        // If it doesn't throw an error, it passed!
        res.json({ success: true, message: "ID Accepted" });

    } catch (error) {
        console.error("ID Check Failed:", error.message);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==========================================
// LISTINGS (Seller & Garage)
// ==========================================
router.get('/listings', authenticate, userController.sellerListingsController);
router.get('/mygarage', authenticate, userController.garageController);

module.exports = router;