const adminUsersService = require("../services/adminUsersService");

exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limitRaw = parseInt(req.query.limit || "20", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 50);

    const data = await adminUsersService.listUsers({ page, limit });
    res.json(data); // { items, page, limit, total, totalPages }
  } catch (err) {
    console.error("Admin list users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limitRaw = parseInt(req.query.limit || "20", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 50);

    if (!q || String(q).trim().length < 1) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 1 character" });
    }

    const data = await adminUsersService.searchUsers({
      searchTerm: String(q).trim(),
      page,
      limit,
    });

    res.json(data); // { items, page, limit, total, totalPages }
  } catch (err) {
    console.error("Admin search users error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};

exports.getUserTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limitRaw = parseInt(req.query.limit || "20", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 50);

    const type = req.query.type ? String(req.query.type).toLowerCase() : null;
    const status = req.query.status
      ? String(req.query.status).toLowerCase()
      : null;

    if (!userId || userId.trim().length < 1) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (type && !["payment", "escrow", "bid"].includes(type)) {
      return res
        .status(400)
        .json({ error: "type must be payment | escrow | bid" });
    }

    const result = await adminUsersService.getUserTransactionHistory({
      userId: userId.trim(),
      page,
      limit,
      type,
      status,
    });

    res.json(result);
  } catch (err) {
    console.error("Admin user transaction history error:", err);
    res.status(500).json({ error: "Failed to fetch user transaction history" });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;

    if (!userId || userId.trim().length < 1) {
      return res.status(400).json({ error: "userId is required" });
    }

    const result = await adminUsersService.suspendUser({
      userId: userId.trim(),
      reason,
    });

    res.json(result);
  } catch (err) {
    console.error("Admin suspend user error:", err);
    res.status(500).json({ error: "Failed to suspend user" });
  }
};

exports.reactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId.trim().length < 1) {
      return res.status(400).json({ error: "userId is required" });
    }

    const result = await adminUsersService.reactivateUser({
      userId: userId.trim(),
    });

    res.json(result);
  } catch (err) {
    console.error("Admin reactivate user error:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to reactivate user",
    });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const reason = req.body?.reason ? String(req.body.reason).trim() : null;
    const evidence = req.body?.evidence ?? null; // can be string or object

    if (!userId || userId.trim().length < 1) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!reason || reason.length < 3) {
      return res
        .status(400)
        .json({ error: "reason is required (min 3 chars)" });
    }

    const result = await adminUsersService.banUser({
      userId: userId.trim(),
      adminId: req.user.id, // assumes your authenticate middleware sets req.user
      reason,
      evidence,
    });

    res.json(result);
  } catch (err) {
    console.error("Admin ban user error:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to ban user" });
  }
};

exports.updateUserRoleController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole, role } = req.body || {};

    if (!userId || userId.trim().length < 1) {
      return res.status(400).json({ error: "userId is required" });
    }

    const normalizedRole = String(newRole ?? role ?? "")
      .trim()
      .toLowerCase();

    if (!normalizedRole) {
      return res.status(400).json({ error: "Role is required" });
    }

    const allowedRoles = new Set(["admin", "inspector", "client"]);
    if (!allowedRoles.has(normalizedRole)) {
      return res
        .status(400)
        .json({ error: "Role must be one of admin, inspector, client" });
    }

    const result = await adminUsersService.updateRole({
      userId: userId.trim(),
      newRole: normalizedRole,
    });

    res
      .status(200)
      .json({ message: "User role updated successfully", user: result });
  } catch (error) {
    console.error("Admin update user role error:", error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Failed to change user role" });
  }
};