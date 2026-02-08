const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth");
const adminFinanceController = require("../controllers/adminFinanceController");

// GET /api/admin/finance/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month
router.get(
  "/revenue",
  authenticate,
  authorize("admin"),
  adminFinanceController.getRevenueDashboard,
);

module.exports = router;
