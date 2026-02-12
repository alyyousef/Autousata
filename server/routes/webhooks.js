const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const webhookService = require("../services/webhookService");
const { authenticate } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (Stripe only, verified by signature)
 *
 * IMPORTANT: This route requires express.raw() middleware
 * to preserve the raw request body for signature verification
 */
router.post("/stripe", paymentController.handleStripeWebhook);

/**
 * @route   POST /api/webhooks/subscribe
 * @desc    Register a webhook subscription
 * @access  Private
 */
router.post(
  "/subscribe",
  authenticate,
  activityLogger({
    action: "WEBHOOK_SUBSCRIBE",
    severity: "INFO",
    entityType: "WEBHOOK",
  }),
  async (req, res) => {
    try {
      const { eventType, webhookUrl } = req.body;

      if (!eventType || !webhookUrl) {
        return res
          .status(400)
          .json({ msg: "Event type and webhook URL are required" });
      }

      // Validate event type
      const validEventTypes = [
        "bid.placed",
        "auction.ending_soon",
        "user.outbid",
        "auction.ended",
        "auction.winner_declared",
      ];

      if (!validEventTypes.includes(eventType)) {
        return res.status(400).json({
          msg: "Invalid event type",
          validTypes: validEventTypes,
        });
      }

      // Validate webhook URL
      try {
        new URL(webhookUrl);
      } catch (err) {
        return res.status(400).json({ msg: "Invalid webhook URL" });
      }

      const result = await webhookService.registerWebhook(
        req.user.id,
        eventType,
        webhookUrl,
      );

      res.json({
        message: "Webhook subscription created",
        subscriptionId: result.id,
        secretKey: result.secretKey, // Return once for user to store
      });
    } catch (err) {
      console.error("Error creating webhook subscription:", err);
      res.status(500).send("Server Error");
    }
  },
);

/**
 * @route   GET /api/webhooks
 * @desc    Get user's webhook subscriptions
 * @access  Private
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const webhooks = await webhookService.getUserWebhooks(req.user.id);

    res.json({ webhooks });
  } catch (err) {
    console.error("Error fetching webhooks:", err);
    res.status(500).send("Server Error");
  }
});

/**
 * @route   DELETE /api/webhooks/:id
 * @desc    Deactivate a webhook subscription
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  activityLogger({
    action: "WEBHOOK_UNSUBSCRIBE",
    severity: "INFO",
    entityType: "WEBHOOK",
    getEntityId: (req) => req.params.id,
  }),
  async (req, res) => {
    try {
      const success = await webhookService.deactivateWebhook(
        req.params.id,
        req.user.id,
      );

      if (!success) {
        return res.status(404).json({ msg: "Webhook subscription not found" });
      }

      res.json({ message: "Webhook subscription deactivated" });
    } catch (err) {
      console.error("Error deactivating webhook:", err);
      res.status(500).send("Server Error");
    }
  },
);

module.exports = router;
