const adminAuthService = require("../services/adminAuthService");

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await adminAuthService.loginAdmin(email, password);

    return res.json({
      message: "Admin login successful",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error("Admin login error:", err);

    // If service throws a known error format
    if (err && err.status && err.message) {
      return res.status(err.status).json({ error: err.message });
    }

    return res.status(500).json({ error: "Admin login failed" });
  }
};
