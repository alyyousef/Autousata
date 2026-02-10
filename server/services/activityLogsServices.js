const oracledb = require("oracledb");
const db = require("../config/db");


const logActivity = async ({
  userId,
  userRole,
  action,
  description
}) => {
  await db.execute(
    `INSERT INTO activity_logs
     (user_id, user_role, action, description)
     VALUES (:userId, :userRole, :action, :description)`,
    { userId, userRole, action, description }
  );
};

module.exports = { logActivity };