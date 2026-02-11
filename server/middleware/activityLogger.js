const { logActivity } = require('../services/activityLogsService');

const activityLogger = ({ action }) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode < 400 && req.user) {
        await logActivity({
          userId: req.user.id,
          userRole: req.user.role, 
          action,
        });
      }
    });
    next();
  };
};

module.exports = activityLogger;
