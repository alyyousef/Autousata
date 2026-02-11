const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe only, verified by signature)
 * 
 * IMPORTANT: This route requires express.raw() middleware 
 * to preserve the raw request body for signature verification
 */
router.post('/stripe', paymentController.handleStripeWebhook);

module.exports = router;
