const adminAuthService = require("../services/adminAuthService");
const { logActivity } = require("../services/activityLogsServices");

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body || {};

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  const ua = req.headers["user-agent"] || null;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await adminAuthService.loginAdmin(email, password);

    await logActivity({
      userId: result.user.id,
      userRole: result.user.role,
      userEmail: email,
      action: "LOGIN_SUCCESS",
      severity: "INFO",
      description: `Admin login successful: ${email}`,
      ipAddress: ip,
      userAgent: ua,
      suspicious: false,
      metadata: { area: "admin_auth" },
    });

    return res.json({
      message: "Admin login successful",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error("Admin login error:", err);

    await logActivity({
      userId: null, // ✅ not "UNKNOWN"
      userRole: "admin",
      userEmail: email || null,
      action: "LOGIN_FAILED",
      severity: "WARN", // ✅ not WARNING
      description: `Admin login failed: ${email || "unknown"}`,
      ipAddress: ip,
      userAgent: ua,
      suspicious: true,
      metadata: { status: err?.status || null, reason: err?.message || null },
    });

    if (err && err.status && err.message) {
      return res.status(err.status).json({ error: err.message });
    }

    return res.status(500).json({ error: "Admin login failed" });
  }
};
