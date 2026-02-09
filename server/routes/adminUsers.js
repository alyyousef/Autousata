const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const adminUsersController = require("../controllers/adminUsersController");

router.get(
  "/",
  authenticate,
  authorize("admin"),
  adminUsersController.listUsers,
);

router.get(
  "/search",
  authenticate,
  authorize("admin"),
  adminUsersController.searchUsers,
);

router.get(
  "/search",
  authenticate,
  authorize("admin"),
  adminUsersController.searchUsers,
);

router.get(
  "/:userId/transactions",
  authenticate,
  authorize("admin"),
  adminUsersController.getUserTransactionHistory,
);

router.patch(
  "/:userId/suspend",
  authenticate,
  authorize("admin"),
  adminUsersController.suspendUser,
);

router.patch(
  "/:userId/reactivate",
  authenticate,
  authorize("admin"),
  adminUsersController.reactivateUser,
);

router.patch(
  "/:userId/ban",
  authenticate,
  authorize("admin"),
  adminUsersController.banUser,
);

module.exports = router;
