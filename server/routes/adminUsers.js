const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const adminUsersController = require("../controllers/adminUsersController");
const activityLogger = require("../middleware/activityLogger");

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
  activityLogger({
    action: "USER_SUSPEND",
    severity: "WARN",
    entityType: "USER",
    getEntityId: (req) => req.params.userId,
    getDescription: (req) => `Admin suspended user ${req.params.userId}`,
  }),
  adminUsersController.suspendUser,
);

router.patch(
  "/:userId/reactivate",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "USER_REACTIVATE",
    severity: "INFO",
    entityType: "USER",
    getEntityId: (req) => req.params.userId,
    getDescription: (req) => `Admin reactivated user ${req.params.userId}`,
  }),
  adminUsersController.reactivateUser,
);

router.patch(
  "/:userId/ban",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "USER_BAN",
    severity: "ALERT",
    entityType: "USER",
    getEntityId: (req) => req.params.userId,
    getDescription: (req) => `Admin banned user ${req.params.userId}`,
  }),
  adminUsersController.banUser,
);

router.patch(
  "/:userId/role",
  authenticate,
  authorize("admin"),
  activityLogger({
    action: "USER_ROLE_CHANGE",
    severity: "ALERT",
    entityType: "USER",
    getEntityId: (req) => req.params.userId,
    getDescription: (req) => `Admin changed role for user ${req.params.userId}`,
  }),
  adminUsersController.updateUserRoleController,
);

module.exports = router;
