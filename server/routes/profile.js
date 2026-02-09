const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware'); // Need 'upload' for file parsing

console.log('✅ Profile Routes Loaded');

// PUT /api/profile (Text Data)
router.put('/', authenticate, userController.updateProfile);

// PUT /api/profile/avatar (Image Data)
// We use 'upload.single("avatar")' because that's what the frontend sends
router.put('/avatar', authenticate, upload.single('avatar'), userController.updateAvatar);
router.put('/kyc', authenticate, upload.single('kycDocument'), userController.uploadKYC);
module.exports = router;