const express = require("express");
const router = express.Router();
const adminAuthController = require("../controllers/adminAuthController");

// POST http://localhost:5001/api/admin/auth/login
router.post("/login", adminAuthController.loginAdmin);

module.exports = router;
