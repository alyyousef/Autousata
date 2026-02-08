const oracledb = require("oracledb");
const db = require("../config/db");

exports.searchUsers = async (searchTerm) => {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `
      SELECT
        ID,
        EMAIL,
        PHONE,
        FIRST_NAME,
        LAST_NAME,
        ROLE,
        IS_ACTIVE,
        IS_BANNED,
        KYC_STATUS
      FROM DIP.USERS
      WHERE
        LOWER(EMAIL) LIKE :q
        OR LOWER(PHONE) LIKE :q
        OR LOWER(FIRST_NAME) LIKE :q
        OR LOWER(LAST_NAME) LIKE :q
      ORDER BY ID
      FETCH FIRST 50 ROWS ONLY
      `,
      {
        q: `%${searchTerm.toLowerCase()}%`,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    return result.rows.map((u) => ({
      id: u.ID,
      email: u.EMAIL,
      phone: u.PHONE,
      firstName: u.FIRST_NAME,
      lastName: u.LAST_NAME,
      role: u.ROLE,
      isActive: u.IS_ACTIVE,
      isBanned: u.IS_BANNED,
      kycStatus: u.KYC_STATUS,
    }));
  } finally {
    if (connection) await connection.close();
  }
};
