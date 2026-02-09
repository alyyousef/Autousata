const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/auth'); 

console.log('✅ Auth Routes Loaded');

// 1. REGISTER (With Image Upload)
router.post('/register', upload.single('profileImage'), (req, res, next) => {
    console.log('📨 Request hit Register Route'); 
    next();
}, authController.register);

// 2. LOGIN
router.post('/login', authController.login);

// 3. REFRESH TOKEN
router.post('/refresh-token', authController.refreshToken);

// 4. VERIFY EMAIL OTP (Make sure this matches the export in authController!)
router.post('/verify-email-otp', authController.verifyEmailOtp);
router.post('/resend-otp', authController.resendOtp);
// 5. GET CURRENT USER (Protected)
router.get('/me', authenticate, authController.getMe);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;