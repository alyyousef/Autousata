const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Debug Log: Print to terminal when this file is loaded
console.log('✅ Auth Routes Loaded');

// POST http://localhost:5000/api/auth/register
router.post('/register', (req, res, next) => {
    console.log('📨 Request hit Register Route'); // Log when request arrives
    next();
}, authController.register);

// POST http://localhost:5000/api/auth/login
router.post('/login', authController.login);

module.exports = router;