const oracledb = require("oracledb");
const db = require("../config/db"); // must expose db.getConnection()

// ✅ helpers
const toBool = (v) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  return false;
};

const normalizeDate = (v) => {
  // expects ISO string from frontend. If empty -> null
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d; // Oracle driver accepts JS Date
};

const safeLike = (s) => {
  // escape % and _ in LIKE
  return s.replace(/[%_]/g, (m) => "\\" + m);
};

const mapLogRow = (r) => {
  // if you used OUT_FORMAT_OBJECT, r already keys by column name
  let metadata = null;
  try {
    if (r.METADATA)
      metadata =
        typeof r.METADATA === "string" ? JSON.parse(r.METADATA) : r.METADATA;
  } catch {
    metadata = r.METADATA ?? null;
  }

  return {
    id: r.ID,
    userId: r.USER_ID ?? null,
    userRole: r.USER_ROLE ?? null,
    userEmail: r.USER_EMAIL ?? null,
    action: r.ACTION ?? null,
    severity: r.SEVERITY ?? null,
    entityType: r.ENTITY_TYPE ?? null,
    entityId: r.ENTITY_ID ?? null,
    description: r.DESCRIPTION ?? null,
    ipAddress: r.IP_ADDRESS ?? null,
    userAgent: r.USER_AGENT ?? null,
    suspicious: r.SUSPICIOUS === "1",
    metadata,
    createdAt: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString() : null,
  };
};

// =========================================================
// GET /api/admin/activity-logs
// Supports query:
// page, limit
// severity, role, action, entityType, entityId
// suspiciousOnly (true/false/1/0)
// from, to (ISO)
// search (matches action/description/userEmail/ip/entityId)
// =========================================================
exports.listActivityLogs = async (req, res, next) => {
  let connection;
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "25", 10), 1),
      100,
    );
    const offset = (page - 1) * limit;

    const severity = (req.query.severity || "").trim();
    const role = (req.query.role || "").trim();
    const action = (req.query.action || "").trim();
    const entityType = (req.query.entityType || "").trim();
    const entityId = (req.query.entityId || "").trim();
    const suspiciousOnly = toBool(req.query.suspiciousOnly);

    const from = normalizeDate(req.query.from);
    const to = normalizeDate(req.query.to);

    const search = (req.query.search || "").trim();

    // Build WHERE dynamically (safe binds)
    const where = [];
    const binds = {};

    if (severity) {
      where.push("SEVERITY = :severity");
      binds.severity = severity;
    }
    if (role) {
      where.push("USER_ROLE = :role");
      binds.role = role;
    }
    if (action) {
      // allow prefix search, ex LOGIN_% or exact. you can change to equals if you want.
      where.push("UPPER(ACTION) LIKE UPPER(:action) ESCAPE '\\'");
      binds.action = safeLike(action) + "%";
    }
    if (entityType) {
      where.push("UPPER(ENTITY_TYPE) = UPPER(:entityType)");
      binds.entityType = entityType;
    }
    if (entityId) {
      where.push("ENTITY_ID = :entityId");
      binds.entityId = entityId;
    }
    if (suspiciousOnly) {
      where.push("SUSPICIOUS = '1'");
    }
    if (from) {
      where.push("CREATED_AT >= :fromDate");
      binds.fromDate = from;
    }
    if (to) {
      where.push("CREATED_AT <= :toDate");
      binds.toDate = to;
    }

    if (search) {
      // Search across several fields
      where.push(`(
        UPPER(ACTION) LIKE UPPER(:q) ESCAPE '\\'
        OR UPPER(DESCRIPTION) LIKE UPPER(:q) ESCAPE '\\'
        OR UPPER(USER_EMAIL) LIKE UPPER(:q) ESCAPE '\\'
        OR UPPER(IP_ADDRESS) LIKE UPPER(:q) ESCAPE '\\'
        OR UPPER(ENTITY_ID) LIKE UPPER(:q) ESCAPE '\\'
      )`);
      binds.q = "%" + safeLike(search) + "%";
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    connection = await db.getConnection();

    // 1) total count
    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM ACTIVITY_LOGS
      ${whereSql}
    `;
    const countResult = await connection.execute(countSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const total = countResult.rows?.[0]?.TOTAL || 0;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    // 2) page items
    const listSql = `
      SELECT
        ID, USER_ID, USER_ROLE, USER_EMAIL, ACTION, SEVERITY,
        ENTITY_TYPE, ENTITY_ID, DESCRIPTION, IP_ADDRESS, USER_AGENT,
        SUSPICIOUS, METADATA, CREATED_AT
      FROM ACTIVITY_LOGS
      ${whereSql}
      ORDER BY CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const listBinds = { ...binds, offset, limit };
    const listResult = await connection.execute(listSql, listBinds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const items = (listResult.rows || []).map(mapLogRow);

    res.json({
      page,
      limit,
      total,
      totalPages,
      items,
    });
  } catch (err) {
    next(err);
  } finally {
    try {
      if (connection) await connection.close();
    } catch {}
  }
};

// =========================================================
// GET /api/admin/activity-logs/:id
// =========================================================
exports.getActivityLogById = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing id" });

    connection = await db.getConnection();

    const sql = `
      SELECT
        ID, USER_ID, USER_ROLE, USER_EMAIL, ACTION, SEVERITY,
        ENTITY_TYPE, ENTITY_ID, DESCRIPTION, IP_ADDRESS, USER_AGENT,
        SUSPICIOUS, METADATA, CREATED_AT
      FROM ACTIVITY_LOGS
      WHERE ID = :id
    `;

    const result = await connection.execute(
      sql,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "NotFound" });
    }

    res.json({ log: mapLogRow(result.rows[0]) });
  } catch (err) {
    next(err);
  } finally {
    try {
      if (connection) await connection.close();
    } catch {}
  }
};

// =========================================================
// GET /api/admin/activity-logs/analytics?from=&to=
// returns:
// - totals by severity
// - totals per day
// - top actions
// =========================================================
exports.getActivityAnalytics = async (req, res, next) => {
  let connection;
  try {
    const from = normalizeDate(req.query.from);
    const to = normalizeDate(req.query.to);

    const where = [];
    const binds = {};

    if (from) {
      where.push("CREATED_AT >= :fromDate");
      binds.fromDate = from;
    }
    if (to) {
      where.push("CREATED_AT <= :toDate");
      binds.toDate = to;
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    connection = await db.getConnection();

    // 1) By severity
    const severitySql = `
      SELECT SEVERITY, COUNT(*) AS CNT
      FROM ACTIVITY_LOGS
      ${whereSql}
      GROUP BY SEVERITY
      ORDER BY CNT DESC
    `;
    const severityRes = await connection.execute(severitySql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // 2) By day
    const byDaySql = `
      SELECT TO_CHAR(TRUNC(CREATED_AT), 'YYYY-MM-DD') AS DAY, COUNT(*) AS CNT
      FROM ACTIVITY_LOGS
      ${whereSql}
      GROUP BY TRUNC(CREATED_AT)
      ORDER BY DAY ASC
    `;
    const byDayRes = await connection.execute(byDaySql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // 3) Top actions (limit 10)
    const topActionsSql = `
      SELECT ACTION, COUNT(*) AS CNT
      FROM ACTIVITY_LOGS
      ${whereSql}
      GROUP BY ACTION
      ORDER BY CNT DESC
      FETCH FIRST 10 ROWS ONLY
    `;
    const topActionsRes = await connection.execute(topActionsSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    res.json({
      bySeverity: (severityRes.rows || []).map((r) => ({
        severity: r.SEVERITY,
        count: r.CNT,
      })),
      byDay: (byDayRes.rows || []).map((r) => ({
        day: r.DAY,
        count: r.CNT,
      })),
      topActions: (topActionsRes.rows || []).map((r) => ({
        action: r.ACTION,
        count: r.CNT,
      })),
    });
  } catch (err) {
    next(err);
  } finally {
    try {
      if (connection) await connection.close();
    } catch {}
  }
};
