const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/auth');

console.log('✅ Auth Routes Loaded');

// Public Routes
router.post('/register', upload.single('profileImage'), (req, res, next) => {
    console.log('📨 Request hit Register Route'); 
    next();
}, authController.register);

router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
module.exports = router;