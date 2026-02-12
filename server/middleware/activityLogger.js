const { logActivity } = require("../services/activityLogsServices");

const activityLogger = ({
  action,
  severity = "INFO",
  entityType = null,
  getEntityId = null,
  getDescription = null,
}) => {
  return (req, res, next) => {
    res.on("finish", async () => {
      try {
        console.log("[Activity] trying to log", {
          action,
          severity,
          user: req.user?.id,
        });

        if (!req.user) return;

        const isSuccess = res.statusCode < 400;

        await logActivity({
          userId: req.user.id,
          userRole: req.user.role,
          action: isSuccess ? action : `${action}_FAILED`,
          severity: isSuccess ? severity : "WARN",
          entityType,
          entityId: getEntityId
            ? getEntityId(req, res)
            : res.locals.entityId || null,

          description: getDescription
            ? getDescription(req, res)
            : `${action} attempt`,
          ipAddress:
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
          userAgent: req.headers["user-agent"] || null,
        });
      } catch (err) {
        console.error("Activity logging failed:", err.message);
      }
    });

    next();
  };
};

module.exports = activityLogger;
