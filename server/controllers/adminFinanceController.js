if (process.env.MOCK_FINANCE === "true") {
  return res.json({
    range: { from, to, groupBy },
    kpis: {
      commissionEgp: 12500,
      processorFeesEgp: 3200,
      gmvEgp: 410000,
      sellerPayoutEgp: 394300,
      completedPaymentsCount: 3,
      refundedAmountEgp: 0,
    },
    series: [
      { bucket: "2026-02-01", commissionEgp: 3500, gmvEgp: 120000 },
      { bucket: "2026-02-03", commissionEgp: 4000, gmvEgp: 150000 },
      { bucket: "2026-02-05", commissionEgp: 5000, gmvEgp: 140000 },
    ],
    escrowsByStatus: [{ status: "released", count: 3, totalAmountEgp: 410000 }],
  });
}

// server/controllers/adminFinanceController.js
const oracledb = require("oracledb");
const db = require("../config/db");

/**
 * Accepts:
 *  - "YYYY-MM-DD" (or ISO string starting with it)
 *  - "MM/DD/YYYY" or "M/D/YYYY"
 * Returns "YYYY-MM-DD" or "" if invalid.
 */
function parseDateOnly(input) {
  const s = String(input || "").trim();

  // ISO: 2026-02-08 (or 2026-02-08T...)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // US: 02/08/2026 or 2/8/2026
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    const mm = String(us[1]).padStart(2, "0");
    const dd = String(us[2]).padStart(2, "0");
    const yyyy = us[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
}

function startOfDayUtc(isoDate) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDaysUtc(dateObj, days) {
  const d = new Date(dateObj.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function buildBucketSql(groupBy) {
  const g = String(groupBy || "day").toLowerCase();

  if (g === "month") {
    return {
      bucketSelect: "TO_CHAR(TRUNC(e.RELEASED_AT, 'MM'), 'YYYY-MM')",
      bucketGroup: "TRUNC(e.RELEASED_AT, 'MM')",
      bucketOrder: "TRUNC(e.RELEASED_AT, 'MM')",
    };
  }

  if (g === "week") {
    return {
      bucketSelect: "TO_CHAR(TRUNC(e.RELEASED_AT, 'IW'), 'IYYY-\"W\"IW')",
      bucketGroup: "TRUNC(e.RELEASED_AT, 'IW')",
      bucketOrder: "TRUNC(e.RELEASED_AT, 'IW')",
    };
  }

  return {
    bucketSelect: "TO_CHAR(TRUNC(e.RELEASED_AT), 'YYYY-MM-DD')",
    bucketGroup: "TRUNC(e.RELEASED_AT)",
    bucketOrder: "TRUNC(e.RELEASED_AT)",
  };
}

/**
 * GET /api/admin/finance/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month
 */
exports.getRevenueDashboard = async (req, res) => {
  let connection;

  try {
    const { from, to, groupBy = "day" } = req.query;

    const fromDate = parseDateOnly(from);
    const toDate = parseDateOnly(to);

    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: "InvalidDateRange",
        message: "Use from/to as YYYY-MM-DD (recommended) or MM/DD/YYYY.",
        received: { from, to },
      });
    }

    const fromTs = startOfDayUtc(fromDate);
    const toExclusive = addDaysUtc(startOfDayUtc(toDate), 1); // inclusive range

    const binds = {
      fromTs: { val: fromTs, type: oracledb.DATE },
      toExclusive: { val: toExclusive, type: oracledb.DATE },
    };

    connection = await db.getConnection();

    // 1) KPIs (earned revenue: released escrows)
    const kpiSql = `
      SELECT
        NVL(SUM(e.COMMISSION_EGP), 0) AS COMMISSION_EGP,
        NVL(SUM(e.PROCESSOR_FEE_EGP), 0) AS PROCESSOR_FEES_EGP,
        NVL(SUM(e.TOTAL_AMOUNT_EGP), 0) AS GMV_EGP,
        NVL(SUM(e.SELLER_PAYOUT_EGP), 0) AS SELLER_PAYOUT_EGP,
        COUNT(*) AS RELEASED_ESCROWS_COUNT
      FROM DIP.ESCROWS e
      WHERE e.RELEASED_AT IS NOT NULL
        AND e.RELEASED_AT >= :fromTs
        AND e.RELEASED_AT <  :toExclusive
        AND e.STATUS = 'released'
    `;

    const kpiRes = await connection.execute(kpiSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const kpiRow = kpiRes.rows?.[0] || {};

    // 2) Payments KPIs (optional)
    const paySql = `
      SELECT
        NVL(SUM(CASE WHEN p.STATUS = 'completed' THEN 1 ELSE 0 END), 0) AS COMPLETED_PAYMENTS_COUNT,
        NVL(SUM(CASE WHEN p.STATUS = 'refunded' THEN p.AMOUNT_EGP ELSE 0 END), 0) AS REFUNDED_AMOUNT_EGP
      FROM DIP.PAYMENTS p
      WHERE p.INITIATED_AT >= :fromTs
        AND p.INITIATED_AT <  :toExclusive
    `;

    const payRes = await connection.execute(paySql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const payRow = payRes.rows?.[0] || {};

    // 3) Series (commission + GMV over time)
    const { bucketSelect, bucketGroup, bucketOrder } = buildBucketSql(groupBy);

    const seriesSql = `
      SELECT
        ${bucketSelect} AS BUCKET,
        NVL(SUM(e.COMMISSION_EGP), 0) AS COMMISSION_EGP,
        NVL(SUM(e.TOTAL_AMOUNT_EGP), 0) AS GMV_EGP,
        COUNT(*) AS RELEASED_ESCROWS_COUNT
      FROM DIP.ESCROWS e
      WHERE e.RELEASED_AT IS NOT NULL
        AND e.RELEASED_AT >= :fromTs
        AND e.RELEASED_AT <  :toExclusive
        AND e.STATUS = 'released'
      GROUP BY ${bucketGroup}
      ORDER BY ${bucketOrder}
    `;

    const seriesRes = await connection.execute(seriesSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // 4) Escrows by status (within range)
    const statusSql = `
      SELECT
        e.STATUS,
        COUNT(*) AS CNT,
        NVL(SUM(e.TOTAL_AMOUNT_EGP), 0) AS TOTAL_AMOUNT_EGP
      FROM DIP.ESCROWS e
      WHERE e.RELEASED_AT IS NOT NULL
        AND e.RELEASED_AT >= :fromTs
        AND e.RELEASED_AT <  :toExclusive
      GROUP BY e.STATUS
      ORDER BY CNT DESC
    `;

    const statusRes = await connection.execute(statusSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // ✅ Always respond JSON
    return res.json({
      range: {
        from: fromDate,
        to: toDate,
        groupBy: String(groupBy || "day").toLowerCase(),
      },
      kpis: {
        commissionEgp: Number(kpiRow.COMMISSION_EGP || 0),
        processorFeesEgp: Number(kpiRow.PROCESSOR_FEES_EGP || 0),
        gmvEgp: Number(kpiRow.GMV_EGP || 0),
        sellerPayoutEgp: Number(kpiRow.SELLER_PAYOUT_EGP || 0),
        releasedEscrowsCount: Number(kpiRow.RELEASED_ESCROWS_COUNT || 0),

        completedPaymentsCount: Number(payRow.COMPLETED_PAYMENTS_COUNT || 0),
        refundedAmountEgp: Number(payRow.REFUNDED_AMOUNT_EGP || 0),
      },
      series: (seriesRes.rows || []).map((r) => ({
        bucket: r.BUCKET,
        commissionEgp: Number(r.COMMISSION_EGP || 0),
        gmvEgp: Number(r.GMV_EGP || 0),
        releasedEscrowsCount: Number(r.RELEASED_ESCROWS_COUNT || 0),
      })),
      escrowsByStatus: (statusRes.rows || []).map((r) => ({
        status: r.STATUS,
        count: Number(r.CNT || 0),
        totalAmountEgp: Number(r.TOTAL_AMOUNT_EGP || 0),
      })),
    });
  } catch (err) {
    console.error("getRevenueDashboard error:", err);

    // ✅ Return JSON error (no HTML)
    return res.status(500).json({
      error: "ServerError",
      message: err?.message || "Failed to fetch revenue dashboard",
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (_) {}
    }
  }
};
