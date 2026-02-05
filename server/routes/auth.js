const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require('../middleware/uploadMiddleware');
// Import the authentication middleware
const { authenticate } = require('../middleware/auth'); 

console.log('✅ Auth Routes Loaded');

// Public Routes
router.post('/register', upload.single('profileImage'), (req, res, next) => {
    console.log('📨 Request hit Register Route'); 
    next();
}, authController.register);

router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected Route (New!)
// This answers the frontend's check on page load
router.get('/me', authenticate, authController.getMe);

module.exports = router;