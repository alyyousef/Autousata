const oracledb = require("oracledb");
const db = require("../config/db");

const mapUser = (u) => ({
  id: u.ID,
  email: u.EMAIL,
  phone: u.PHONE,
  firstName: u.FIRST_NAME,
  lastName: u.LAST_NAME,
  role: u.ROLE,
  isActive: u.IS_ACTIVE,
  isBanned: u.IS_BANNED,
  kycStatus: u.KYC_STATUS,
});

exports.listUsers = async ({ page, limit }) => {
  let connection;
  try {
    connection = await db.getConnection();
    const offset = (page - 1) * limit;

    const totalRes = await connection.execute(
      `SELECT COUNT(*) AS TOTAL FROM DIP.USERS`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const total = Number(totalRes.rows[0].TOTAL || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const result = await connection.execute(
      `
      SELECT
        ID, EMAIL, PHONE, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE, IS_BANNED, KYC_STATUS
      FROM DIP.USERS
      ORDER BY CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      { offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return { items: result.rows.map(mapUser), page, limit, total, totalPages };
  } finally {
    if (connection) await connection.close();
  }
};

exports.searchUsers = async ({ searchTerm, page, limit }) => {
  let connection;
  try {
    connection = await db.getConnection();
    const offset = (page - 1) * limit;
    const q = `%${searchTerm.toLowerCase()}%`;

    const totalRes = await connection.execute(
      `
      SELECT COUNT(*) AS TOTAL
      FROM DIP.USERS
      WHERE
        LOWER(EMAIL) LIKE :q
        OR LOWER(PHONE) LIKE :q
        OR LOWER(FIRST_NAME) LIKE :q
        OR LOWER(LAST_NAME) LIKE :q
      `,
      { q },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const total = Number(totalRes.rows[0].TOTAL || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const result = await connection.execute(
      `
      SELECT
        ID, EMAIL, PHONE, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE, IS_BANNED, KYC_STATUS
      FROM DIP.USERS
      WHERE
        LOWER(EMAIL) LIKE :q
        OR LOWER(PHONE) LIKE :q
        OR LOWER(FIRST_NAME) LIKE :q
        OR LOWER(LAST_NAME) LIKE :q
      ORDER BY CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      { q, offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return { items: result.rows.map(mapUser), page, limit, total, totalPages };
  } finally {
    if (connection) await connection.close();
  }
};

exports.getUserTransactionHistory = async ({
  userId,
  page,
  limit,
  type,
  status,
}) => {
  let connection;
  try {
    connection = await db.getConnection();

    const offset = (page - 1) * limit;

    // Filters are optional. We apply them safely using bind variables.
    // We keep status filtering inside each type block because statuses differ.
    const result = await connection.execute(
      `
      SELECT *
      FROM (
        -- 1) PAYMENTS where user is buyer or seller
        SELECT
          'payment' AS TYPE,
          p.ID AS ID,
          p.INITIATED_AT AS OCCURRED_AT,
          LOWER(p.STATUS) AS STATUS,
          p.AUCTION_ID AS AUCTION_ID,
          p.AMOUNT_EGP AS AMOUNT_EGP,
          CASE
            WHEN p.BUYER_ID = :userId THEN 'buyer'
            WHEN p.SELLER_ID = :userId THEN 'seller'
            ELSE NULL
          END AS ROLE,
          p.PAYMENT_METHOD AS PAYMENT_METHOD,
          p.GATEWAY AS GATEWAY,
          p.GATEWAY_ORDER_ID AS GATEWAY_ORDER_ID,
          p.GATEWAY_TRANS_ID AS GATEWAY_TRANS_ID,
          p.CURRENCY AS CURRENCY,
          CAST(NULL AS VARCHAR2(20)) AS BID_SOURCE,
          CAST(NULL AS NUMBER) AS BID_AMOUNT_EGP
        FROM DIP.PAYMENTS p
        WHERE (p.BUYER_ID = :userId OR p.SELLER_ID = :userId)
          AND (:type IS NULL OR :type = 'payment')
          AND (:status IS NULL OR LOWER(p.STATUS) = :status)

        UNION ALL

        -- 2) ESCROWS where user is buyer or seller (or dispute filer)
        SELECT
          'escrow' AS TYPE,
          e.ID AS ID,
          e.HELD_AT AS OCCURRED_AT,
          LOWER(e.STATUS) AS STATUS,
          e.AUCTION_ID AS AUCTION_ID,
          e.TOTAL_AMOUNT_EGP AS AMOUNT_EGP,
          CASE
            WHEN e.BUYER_ID = :userId THEN 'buyer'
            WHEN e.SELLER_ID = :userId THEN 'seller'
            ELSE 'related'
          END AS ROLE,
          CAST(NULL AS VARCHAR2(20)) AS PAYMENT_METHOD,
          CAST(NULL AS VARCHAR2(20)) AS GATEWAY,
          CAST(NULL AS VARCHAR2(255)) AS GATEWAY_ORDER_ID,
          CAST(NULL AS VARCHAR2(255)) AS GATEWAY_TRANS_ID,
          CAST(NULL AS VARCHAR2(3)) AS CURRENCY,
          CAST(NULL AS VARCHAR2(20)) AS BID_SOURCE,
          CAST(NULL AS NUMBER) AS BID_AMOUNT_EGP
        FROM DIP.ESCROWS e
        WHERE (e.BUYER_ID = :userId OR e.SELLER_ID = :userId OR e.DISPUTE_FILED_BY = :userId)
          AND (:type IS NULL OR :type = 'escrow')
          AND (:status IS NULL OR LOWER(e.STATUS) = :status)

        UNION ALL

        -- 3) BIDS where user is bidder (behavior)
        SELECT
          'bid' AS TYPE,
          b.ID AS ID,
          b.CREATED_AT AS OCCURRED_AT,
          LOWER(b.STATUS) AS STATUS,
          b.AUCTION_ID AS AUCTION_ID,
          CAST(NULL AS NUMBER(15,2)) AS AMOUNT_EGP,
          'bidder' AS ROLE,
          CAST(NULL AS VARCHAR2(20)) AS PAYMENT_METHOD,
          CAST(NULL AS VARCHAR2(20)) AS GATEWAY,
          CAST(NULL AS VARCHAR2(255)) AS GATEWAY_ORDER_ID,
          CAST(NULL AS VARCHAR2(255)) AS GATEWAY_TRANS_ID,
          CAST(NULL AS VARCHAR2(3)) AS CURRENCY,
          b.BID_SOURCE AS BID_SOURCE,
          b.AMOUNT_EGP AS BID_AMOUNT_EGP
        FROM DIP.BIDS b
        WHERE b.BIDDER_ID = :userId
          AND (:type IS NULL OR :type = 'bid')
          AND (:status IS NULL OR LOWER(b.STATUS) = :status)
      )
      ORDER BY OCCURRED_AT DESC NULLS LAST
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      {
        userId,
        type: type || null,
        status: status || null,
        offset,
        limit,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    const items = result.rows.map((r) => ({
      type: r.TYPE,
      id: r.ID,
      occurredAt: r.OCCURRED_AT,
      status: r.STATUS,
      auctionId: r.AUCTION_ID,
      amountEgp: r.AMOUNT_EGP,
      role: r.ROLE,
      details:
        r.TYPE === "payment"
          ? {
              paymentMethod: r.PAYMENT_METHOD,
              gateway: r.GATEWAY,
              gatewayOrderId: r.GATEWAY_ORDER_ID,
              gatewayTransId: r.GATEWAY_TRANS_ID,
              currency: r.CURRENCY,
            }
          : r.TYPE === "escrow"
            ? {
                // you can add more escrow columns if you want (commission, payout, etc.)
              }
            : {
                bidSource: r.BID_SOURCE,
                bidAmountEgp: r.BID_AMOUNT_EGP,
              },
    }));

    return { page, limit, items };
  } finally {
    if (connection) await connection.close();
  }
};

exports.suspendUser = async ({ userId, reason }) => {
  let connection;
  try {
    connection = await db.getConnection();

    // 1) Load user (check exists + role)
    const userRes = await connection.execute(
      `
      SELECT ID, EMAIL, ROLE, IS_ACTIVE, IS_BANNED, KYC_STATUS
      FROM DIP.USERS
      WHERE ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (userRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const u = userRes.rows[0];

    // Optional safety rule: don’t suspend admins
    if (String(u.ROLE).toLowerCase() === "admin") {
      const err = new Error("Cannot suspend an admin account");
      err.statusCode = 403;
      throw err;
    }

    // 2) Update (suspend = IS_ACTIVE '0')
    await connection.execute(
      `
      UPDATE DIP.USERS
      SET
        IS_ACTIVE = '0',
        BAN_REASON = COALESCE(:reason, BAN_REASON),
        UPDATED_AT = CURRENT_TIMESTAMP
      WHERE ID = :userId
      `,
      { userId, reason },
      { autoCommit: true },
    );

    return {
      message: "User suspended",
      user: {
        id: u.ID,
        email: u.EMAIL,
        role: u.ROLE,
        isActive: "0",
        isBanned: u.IS_BANNED,
        kycStatus: u.KYC_STATUS,
        reason: reason || null,
      },
    };
  } finally {
    if (connection) await connection.close();
  }
};

exports.reactivateUser = async ({ userId }) => {
  let connection;
  try {
    connection = await db.getConnection();

    // Fetch user
    const userRes = await connection.execute(
      `
      SELECT ID, EMAIL, ROLE, IS_ACTIVE, IS_BANNED, BAN_REASON, KYC_STATUS
      FROM DIP.USERS
      WHERE ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (userRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const u = userRes.rows[0];

    // Recommended rule: if user is banned, don’t reactivate here (different action)
    if (String(u.IS_BANNED) === "1") {
      const err = new Error(
        "User is banned. Unban required before reactivation.",
      );
      err.statusCode = 409; // conflict
      throw err;
    }

    // Optional: don’t change admins
    if (String(u.ROLE).toLowerCase() === "admin") {
      const err = new Error(
        "Cannot reactivate an admin account via this endpoint",
      );
      err.statusCode = 403;
      throw err;
    }

    await connection.execute(
      `
      UPDATE DIP.USERS
      SET
        IS_ACTIVE = '1',
        BAN_REASON = NULL,
        UPDATED_AT = CURRENT_TIMESTAMP
      WHERE ID = :userId
      `,
      { userId },
      { autoCommit: true },
    );

    return {
      message: "User reactivated",
      user: {
        id: u.ID,
        email: u.EMAIL,
        role: u.ROLE,
        isActive: "1",
        isBanned: u.IS_BANNED,
        kycStatus: u.KYC_STATUS,
      },
    };
  } finally {
    if (connection) await connection.close();
  }
};

exports.banUser = async ({ userId, adminId, reason, evidence }) => {
  let connection;
  try {
    connection = await db.getConnection();

    const userRes = await connection.execute(
      `
      SELECT ID, EMAIL, ROLE, IS_ACTIVE, IS_BANNED, KYC_STATUS
      FROM DIP.USERS
      WHERE ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (userRes.rows.length === 0) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const u = userRes.rows[0];

    // Safety: don’t ban admins
    if (String(u.ROLE).toLowerCase() === "admin") {
      const err = new Error("Cannot ban an admin account");
      err.statusCode = 403;
      throw err;
    }

    // Start transaction
    // (oracledb autocommit off by default unless you set it)
    await connection.execute(
      `
      UPDATE DIP.USERS
      SET
        IS_BANNED = '1',
        IS_ACTIVE = '0',
        BAN_REASON = :reason,
        UPDATED_AT = CURRENT_TIMESTAMP
      WHERE ID = :userId
      `,
      { userId, reason },
    );

    // Log moderation action (recommended)
    await connection.execute(
      `
      INSERT INTO DIP.USER_MODERATION_LOGS (USER_ID, ADMIN_ID, ACTION, REASON, EVIDENCE)
      VALUES (:userId, :adminId, 'ban', :reason, :evidence)
      `,
      {
        userId,
        adminId,
        reason,
        evidence: evidence ? JSON.stringify(evidence) : null,
      },
    );

    await connection.commit();

    return {
      message: "User permanently banned",
      user: {
        id: u.ID,
        email: u.EMAIL,
        role: u.ROLE,
        isActive: "0",
        isBanned: "1",
        kycStatus: u.KYC_STATUS,
      },
      audit: {
        action: "ban",
        reason,
      },
    };
  } catch (e) {
    // rollback if anything fails
    try {
      if (connection) await connection.rollback();
    } catch {}
    throw e;
  } finally {
    if (connection) await connection.close();
  }
};

exports.updaterole= async(userId,newRole) =>{
    let connection;
    try{
        connection= await oracledb.getConnection();
        const result=await connection.execute(
            `UPDATE DIP.USERS
            SET ROLE=:newRole
            WHERE ID=:userId`,
            {newRole,userId},
            {autoCommit:true}
        );
        return result.rowsAffected===1;
    } 
    catch(error){
        console.error('Error updating user role:',error);
        throw error;
    }
    finally{
        if(connection){
            try {
                await connection.close();
            }
            catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};
