const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
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

module.exports = router;