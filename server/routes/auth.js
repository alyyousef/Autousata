const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware'); // <--- CRITICAL IMPORT

// Debug Log: Print to terminal when this file is loaded
console.log('✅ Auth Routes Loaded');

// POST http://localhost:5001/api/auth/register
// We added 'upload.single' here. This tells the server: 
// "Look for a file named 'profileImage' in the request."
router.post('/register', upload.single('profileImage'), (req, res, next) => {
    console.log('📨 Request hit Register Route'); 
    next();
}, authController.register);

// POST http://localhost:5001/api/auth/login
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);

// GET http://localhost:5001/api/auth/me
router.get('/me', authenticate, (req, res) => {
    return res.json({ user: req.user });
});
module.exports = router;