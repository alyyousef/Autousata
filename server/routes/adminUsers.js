const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const adminUsersController = require("../controllers/adminUsersController");

router.get(
  "/search",
  authenticate,
  authorize("admin"),
  adminUsersController.searchUsers,
);

module.exports = router;
