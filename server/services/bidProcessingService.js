const oracledb = require('oracledb');
const { randomUUID } = require('crypto');
const db = require('../config/db');

/**
 * Bid Processing Service
 * Handles all bid validation, processing, and auto-extension logic
 * Uses Oracle row-level locking to prevent race conditions
 */

/**
 * Calculate the next minimum bid amount
 * @param {number} currentBid - Current highest bid
 * @param {number} minIncrement - Minimum bid increment
 * @returns {number} - Minimum allowed next bid
 */
function calculateNextMinBid(currentBid, minIncrement) {
  return Number(currentBid) + Number(minIncrement);
}

/**
 * Check if auction should be auto-extended
 * @param {Object} auction - Auction object with auto-extend settings
 * @param {Date} bidTime - Time when bid was placed
 * @returns {boolean} - True if auction should be extended
 */
function shouldAutoExtend(auction, bidTime) {
  if (!auction.AUTO_EXTEND_ENABLED || auction.AUTO_EXTEND_ENABLED === 0) {
    return false;
  }

  const endTime = new Date(auction.END_TIME);
  const autoExtendMinutes = Number(auction.AUTO_EXTEND_MINUTES) || 5;
  const maxExtensions = Number(auction.MAX_AUTO_EXTENSIONS) || 3;
  const currentExtensions = Number(auction.AUTO_EXT_COUNT) || 0;

  // Check if already at max extensions
  if (currentExtensions >= maxExtensions) {
    return false;
  }

  // Check if bid is within the auto-extend window
  const timeDiffMs = endTime.getTime() - bidTime.getTime();
  const timeDiffMinutes = timeDiffMs / (1000 * 60);

  return timeDiffMinutes <= autoExtendMinutes && timeDiffMinutes >= 0;
}

/**
 * Handle auto-extension of auction
 * @param {string} auctionId - Auction ID
 * @param {Object} auction - Current auction state
 * @param {Object} connection - Oracle DB connection
 * @returns {Promise<Object>} - Updated auction with new end time
 */
async function handleAutoExtension(auctionId, auction, connection) {
  const extendMinutes = Number(auction.AUTO_EXTEND_MINUTES) || 5;
  const currentExtCount = Number(auction.AUTO_EXT_COUNT) || 0;

  await connection.execute(
    `UPDATE auctions
     SET end_time = end_time + INTERVAL '${extendMinutes}' MINUTE,
         auto_ext_count = :newCount
     WHERE id = :auctionId`,
    {
      newCount: currentExtCount + 1,
      auctionId
    },
    { autoCommit: false }
  );

  const newEndTime = new Date(auction.END_TIME);
  newEndTime.setMinutes(newEndTime.getMinutes() + extendMinutes);

  return {
    extended: true,
    newEndTime,
    extensionCount: currentExtCount + 1
  };
}

/**
 * Validate bid before processing
 * @param {string} auctionId - Auction ID
 * @param {string} userId - Bidder user ID
 * @param {number} amount - Bid amount
 * @param {Object} connection - Oracle DB connection
 * @returns {Promise<Object>} - { valid: boolean, error: string, auction: Object }
 */
async function validateBid(auctionId, userId, amount, connection) {
  // 1. Fetch auction with row-level lock
  const auctionResult = await connection.execute(
    `SELECT
      a.id,
      a.seller_id,
      a.status,
      a.end_time,
      a.current_bid_egp,
      a.starting_bid_egp,
      a.min_bid_increment,
      a.auto_extend_enabled,
      a.auto_extend_minutes,
      a.max_auto_extensions,
      a.auto_ext_count
    FROM auctions a
    WHERE a.id = :auctionId
    FOR UPDATE`,
    { auctionId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (!auctionResult.rows || auctionResult.rows.length === 0) {
    return { valid: false, error: 'Auction not found' };
  }

  const auction = auctionResult.rows[0];

  // 2. Check if seller is trying to bid
  if (auction.SELLER_ID === userId) {
    return { valid: false, error: 'Sellers cannot bid on their own auctions' };
  }

  // 3. Check auction status
  const statusValue = typeof auction.STATUS === 'string' ? auction.STATUS.toLowerCase() : '';
  if (statusValue !== 'live') {
    return { valid: false, error: 'Auction is not open for bidding' };
  }

  // 4. Check if auction has ended
  const endTime = new Date(auction.END_TIME);
  if (endTime.getTime() <= Date.now()) {
    return { valid: false, error: 'Auction has ended' };
  }

  // 5. Check bid amount
  const currentBid = Number(auction.CURRENT_BID_EGP) || Number(auction.STARTING_BID_EGP) || 0;
  const minIncrement = Number(auction.MIN_BID_INCREMENT) || 50;
  const minAllowedBid = calculateNextMinBid(currentBid, minIncrement);

  if (amount < minAllowedBid) {
    return {
      valid: false,
      error: `Minimum bid is EGP ${minAllowedBid.toLocaleString()}`
    };
  }

  return { valid: true, auction };
}

/**
 * Process a bid (insert + update auction)
 * @param {string} auctionId - Auction ID
 * @param {string} userId - Bidder user ID
 * @param {number} amount - Bid amount
 * @param {string} bidSource - 'manual', 'auto_proxy', or 'auto_extend'
 * @param {string} ipAddress - Bidder IP address (optional)
 * @param {Object} connection - Oracle DB connection (must be provided)
 * @returns {Promise<Object>} - { success: boolean, bid: Object, error: string, autoExtended: boolean }
 */
async function processBid(auctionId, userId, amount, bidSource = 'manual', ipAddress = null, connection) {
  try {
    // 1. Validate bid
    const validation = await validateBid(auctionId, userId, amount, connection);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const auction = validation.auction;
    const bidId = randomUUID();
    const bidTime = new Date();

    // 2. Insert bid
    await connection.execute(
      `INSERT INTO bids (
        id,
        auction_id,
        bidder_id,
        amount_egp,
        status,
        bid_source,
        ip_address,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :auctionId,
        :bidderId,
        :amount,
        :status,
        :bidSource,
        :ipAddress,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )`,
      {
        id: bidId,
        auctionId,
        bidderId: userId,
        amount,
        status: 'accepted',
        bidSource,
        ipAddress
      },
      { autoCommit: false }
    );

    // 3. Update auction
    await connection.execute(
      `UPDATE auctions
       SET current_bid_egp = :amount,
           bid_count = NVL(bid_count, 0) + 1,
           leading_bidder_id = :bidderId
       WHERE id = :auctionId`,
      {
        amount,
        bidderId: userId,
        auctionId
      },
      { autoCommit: false }
    );

    // 4. Check for auto-extension
    let autoExtendInfo = null;
    if (shouldAutoExtend(auction, bidTime)) {
      autoExtendInfo = await handleAutoExtension(auctionId, auction, connection);
    }

    // 5. Commit transaction
    await connection.commit();

    return {
      success: true,
      bid: {
        id: bidId,
        auctionId,
        bidderId: userId,
        amount,
        timestamp: bidTime.toISOString(),
        bidSource
      },
      autoExtended: autoExtendInfo ? true : false,
      autoExtendInfo
    };
  } catch (err) {
    // Rollback on error
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    throw err;
  }
}

/**
 * Get recent bids for an auction (for bid history)
 * @param {string} auctionId - Auction ID
 * @param {number} limit - Number of bids to fetch
 * @returns {Promise<Array>} - Array of bid objects
 */
async function getRecentBids(auctionId, limit = 20) {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT
        b.id,
        b.bidder_id,
        b.amount_egp,
        b.bid_source,
        b.created_at,
        u.first_name,
        u.last_name
      FROM bids b
      JOIN users u ON u.id = b.bidder_id
      WHERE b.auction_id = :auctionId
        AND b.status = 'accepted'
      ORDER BY b.created_at DESC
      FETCH FIRST :limit ROWS ONLY`,
      { auctionId, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows || []).map(row => ({
      id: row.ID,
      bidderId: row.BIDDER_ID,
      firstName: row.FIRST_NAME,
      lastName: row.LAST_NAME,
      amount: Number(row.AMOUNT_EGP),
      bidSource: row.BID_SOURCE,
      timestamp: row.CREATED_AT
    }));
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Handle proxy bid auto-increment
 * @param {string} auctionId - Auction ID
 * @param {string} userId - User with proxy bid
 * @param {number} newCompetingBid - Amount of new competing bid
 * @param {Object} connection - Oracle DB connection
 * @returns {Promise<Object>} - Result of auto-bid
 */
async function handleProxyBid(auctionId, userId, newCompetingBid, connection) {
  // Get user's proxy bid max
  const proxyResult = await connection.execute(
    `SELECT proxy_bid_max_egp
     FROM bids
     WHERE auction_id = :auctionId
       AND bidder_id = :userId
       AND proxy_bid_max_egp IS NOT NULL
       AND status = 'accepted'
     ORDER BY created_at DESC
     FETCH FIRST 1 ROW ONLY`,
    { auctionId, userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (!proxyResult.rows || proxyResult.rows.length === 0) {
    return { hasProxy: false };
  }

  const proxyMax = Number(proxyResult.rows[0].PROXY_BID_MAX_EGP);
  
  // Get auction increment
  const auctionResult = await connection.execute(
    `SELECT min_bid_increment FROM auctions WHERE id = :auctionId`,
    { auctionId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  
  const minIncrement = Number(auctionResult.rows[0]?.MIN_BID_INCREMENT) || 50;
  const autoBidAmount = Math.min(proxyMax, newCompetingBid + minIncrement);

  // Check if proxy max is high enough
  if (autoBidAmount <= newCompetingBid) {
    return { hasProxy: true, outbid: true, proxyMax };
  }

  // Place auto-bid
  return await processBid(auctionId, userId, autoBidAmount, 'auto_proxy', null, connection);
}

module.exports = {
  calculateNextMinBid,
  shouldAutoExtend,
  handleAutoExtension,
  validateBid,
  processBid,
  getRecentBids,
  handleProxyBid
};
