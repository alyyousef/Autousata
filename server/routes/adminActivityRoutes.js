const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const adminActivityController = require("../controllers/adminActivityController");

// GET /api/admin/activity-logs
router.get(
  "/",
  authenticate,
  authorize("admin"),
  adminActivityController.listActivityLogs,
);

// GET /api/admin/activity-logs/analytics
router.get(
  "/analytics",
  authenticate,
  authorize("admin"),
  adminActivityController.getActivityAnalytics,
);

// GET /api/admin/activity-logs/:id
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  adminActivityController.getActivityLogById,
);

module.exports = router;
