const adminUsersService = require("../services/adminUsersService");

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters",
      });
    }

    const users = await adminUsersService.searchUsers(q.trim());
    res.json(users);
  } catch (err) {
    console.error("Admin search users error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};
