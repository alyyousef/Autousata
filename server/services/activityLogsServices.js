const db = require("../config/db");

const logActivity = async (data) => {
  let connection;

  try {
    connection = await db.getConnection();

    await connection.execute(
      `INSERT INTO DIP.ACTIVITY_LOGS
       (user_id, user_role, user_email, action, description, severity,
        entity_type, entity_id, ip_address, user_agent, suspicious, metadata)
       VALUES
       (:userId, :userRole, :userEmail, :action, :description, :severity,
        :entityType, :entityId, :ipAddress, :userAgent, :suspicious, :metadata)`,
      {
        userId: data.userId ?? null,
        userRole: data.userRole ?? null,
        userEmail: data.userEmail ?? null,
        action: data.action,
        description: data.description ?? null,
        severity: data.severity || "INFO",
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        suspicious: data.suspicious ? "1" : "0",
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      { autoCommit: true },
    );
  } catch (err) {
    console.error("❌ Activity log failed:", err.message);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {}
    }
  }
};

module.exports = { logActivity };
