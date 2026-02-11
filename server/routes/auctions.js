const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { randomUUID } = require('crypto');
const { authenticate: auth } = require('../middleware/auth');
const { rateLimitBid } = require('../middleware/rateLimiter');
const bidProcessingService = require('../services/bidProcessingService');
const { getIO } = require('../server');

/**
 * Safely parse the IMAGES column from the database (VEHICLES.IMAGES).
 * Handles: JSON arrays, plain URL strings, comma-separated URLs,
 * null/undefined, CLOB objects, and malformed data.
 * Always returns a string[] of image URLs.
 */
function parseImagesColumn(raw) {
  if (!raw) return [];
  let str = raw;
  if (typeof raw !== 'string') {
    try { str = String(raw); } catch { return []; }
  }
  str = str.trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.length > 0);
      }
    } catch { /* fall through */ }
  }
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str.split(',').map(u => u.trim()).filter(u => u.length > 0);
  }
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.length > 0);
    }
    if (typeof parsed === 'string' && parsed.startsWith('http')) {
      return [parsed];
    }
  } catch { /* fall through */ }
  return [];
}

/**
 * Normalize auction status from database format to API format.
 * Maps lowercase DB values to uppercase frontend-expected values.
 * Example: 'live' → 'ACTIVE', 'draft' → 'DRAFT'
 */
function normalizeAuctionStatus(dbStatus) {
  if (!dbStatus) return 'UNKNOWN';
  const statusMap = {
    'draft': 'DRAFT',
    'scheduled': 'SCHEDULED',
    'live': 'ACTIVE',
    'ended': 'ENDED',
    'settled': 'SETTLED',
    'cancelled': 'CANCELLED'
  };
  const normalized = statusMap[String(dbStatus).toLowerCase()];
  return normalized || String(dbStatus).toUpperCase();
}

// POST /api/auctions - Create a new auction (draft)
// Accepts durationDays instead of startTime/endTime.
// Actual start/end times are calculated when admin approves the vehicle.
router.post('/', auth, async (req, res) => {
  let connection;
  try {
    const {
      vehicleId,
      durationDays,
      startPrice,
      reservePrice
    } = req.body;

    if (!vehicleId || startPrice === undefined || reservePrice === undefined) {
      return res.status(400).json({ msg: 'Missing required auction fields' });
    }

    // Validate durationDays — must be 1, 3, or 7
    const validDurations = [1, 3, 7];
    const duration = Number(durationDays) || 3;
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ msg: 'Invalid duration. Must be 1, 3, or 7 days.' });
    }

    // Placeholder dates — will be overwritten on admin approval
    // IMPORTANT: END_TIME must be > START_TIME to satisfy CHK_AUCT_DATES constraint
    const placeholderStart = new Date();
    const placeholderEnd = new Date(placeholderStart.getTime() + (duration * 24 * 60 * 60 * 1000)); // duration days later

    connection = await oracledb.getConnection();

    const vehicleResult = await connection.execute(
      `SELECT id, seller_id, status
       FROM vehicles
       WHERE id = :vehicleId`,
      { vehicleId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!vehicleResult.rows || vehicleResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }

    const vehicleRow = vehicleResult.rows[0];
    if (vehicleRow.SELLER_ID !== req.user.id) {
      return res.status(403).json({ msg: 'User not authorized to auction this vehicle' });
    }

    const existingAuction = await connection.execute(
      `SELECT id FROM auctions WHERE vehicle_id = :vehicleId`,
      { vehicleId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existingAuction.rows && existingAuction.rows.length > 0) {
      return res.status(400).json({ msg: 'Auction already exists for this vehicle' });
    }

    const auctionId = randomUUID();
    const startBid = Number(startPrice) || 0;

    await connection.execute(
      `INSERT INTO auctions (
        id,
        vehicle_id,
        seller_id,
        status,
        start_time,
        end_time,
        original_end_time,
        duration_days,
        reserve_price_egp,
        starting_bid_egp,
        current_bid_egp,
        bid_count,
        min_bid_increment,
        auto_extend_enabled,
        auto_extend_minutes,
        max_auto_extensions,
        auto_ext_count
      ) VALUES (
        :id,
        :vehicleId,
        :sellerId,
        :status,
        :startTime,
        :endTime,
        :originalEndTime,
        :durationDays,
        :reservePriceEgp,
        :startingBidEgp,
        :currentBid,
        :bidCount,
        :minBidIncrement,
        :autoExtendEnabled,
        :autoExtendMinutes,
        :maxAutoExtensions,
        :autoExtCount
      )`,
      {
        id: auctionId,
        vehicleId,
        sellerId: req.user.id,
        status: 'draft',
        startTime: placeholderStart,
        endTime: placeholderEnd,
        originalEndTime: placeholderEnd,
        durationDays: duration,
        reservePriceEgp: Number(reservePrice) || 0,
        startingBidEgp: startBid,
        currentBid: startBid,
        bidCount: 0,
        minBidIncrement: 50,
        autoExtendEnabled: 1,
        autoExtendMinutes: 5,
        maxAutoExtensions: 3,
        autoExtCount: 0
      },
      { autoCommit: true }
    );

    res.json({
      _id: auctionId,
      vehicleId,
      sellerId: req.user.id,
      durationDays: duration,
      startPrice: startBid,
      reservePrice: Number(reservePrice) || 0,
      currentBid: startBid,
      bidCount: 0,
      minBidIncrement: 50,
      autoExtendEnabled: true,
      autoExtendMinutes: 5,
      maxAutoExtensions: 3,
      autoExtendCount: 0,
      status: 'draft'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr.message);
      }
    }
  }
});

// GET /api/auctions - List auctions (public/filtered) with Pagination & Sorting
router.get('/', async (req, res) => {
  let connection;
  try {
    const { page = 1, limit = 9, sortBy = 'endingSoon' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 9);
    const offset = (pageNum - 1) * limitNum;

    let orderBy = 'a.end_time ASC';
    switch (sortBy) {
      case 'highestBid':
        orderBy = 'a.current_bid_egp DESC NULLS LAST';
        break;
      case 'mostBids':
        orderBy = 'bid_count DESC';
        break;
      case 'newest':
        orderBy = 'a.start_time DESC';
        break;
      case 'endingSoon':
      default:
        orderBy = 'a.end_time ASC';
    }

    connection = await oracledb.getConnection();

    const countResult = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM auctions a
       WHERE a.status = 'live'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const total = countResult.rows?.[0]?.TOTAL || 0;

    const sql = `
      SELECT
        a.id AS auction_id,
        a.vehicle_id,
        a.seller_id,
        a.status,
        a.start_time,
        a.end_time,
        a.current_bid_egp,
        a.bid_count,
        v.make,
        v.model,
        v.year_mfg,
        v.mileage_km,
        v.car_condition,
        v.price_egp,
        v.vin,
        v.plate_number,
        v.description,
        v.location_city,
        v.features,
        v.images
      FROM auctions a
      JOIN vehicles v ON v.id = a.vehicle_id
      WHERE a.status = 'live'
      ORDER BY ${orderBy}
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const result = await connection.execute(
      sql,
      { offset, limit: limitNum },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const auctions = (result.rows || []).map((row) => {
      const featuresRaw = row.FEATURES;
      let features = [];
      if (typeof featuresRaw === 'string') {
        try {
          features = JSON.parse(featuresRaw);
        } catch (e) {
          features = [];
        }
      }

      const conditionValue = typeof row.CAR_CONDITION === 'string'
        ? row.CAR_CONDITION.toLowerCase()
        : '';

      const conditionMap = {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor'
      };

      // Parse vehicle images from VEHICLES.IMAGES column
      let images = parseImagesColumn(row.IMAGES);

      return {
        _id: row.AUCTION_ID,
        vehicleId: {
          id: row.VEHICLE_ID,
          make: row.MAKE,
          model: row.MODEL,
          year: Number(row.YEAR_MFG) || 0,
          mileage: Number(row.MILEAGE_KM) || 0,
          vin: row.VIN,
          condition: conditionMap[conditionValue] || 'Good',
          description: row.DESCRIPTION || '',
          
          location: row.LOCATION_CITY || '',
          features
        },
        sellerId: row.SELLER_ID,
        currentBid: Number(row.CURRENT_BID_EGP) || 0,
        startPrice: Number(row.PRICE_EGP) || 0,
        reservePrice: Number(row.PRICE_EGP) || 0,
        bidCount: Number(row.BID_COUNT) || 0,
        endTime: row.END_TIME,
        status: normalizeAuctionStatus(row.STATUS)
      };
    });

    res.json({
      auctions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr.message);
      }
    }
  }
});

// GET /api/auctions/seller - List seller auctions (authenticated)
router.get('/seller', auth, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT
        id,
        vehicle_id,
        seller_id,
        status,
        start_time,
        end_time,
        current_bid_egp
      FROM auctions
      WHERE seller_id = :sellerId`,
      { sellerId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const auctions = (result.rows || []).map((row) => ({
      _id: row.ID,
      vehicleId: row.VEHICLE_ID,
      sellerId: row.SELLER_ID,
      status: normalizeAuctionStatus(row.STATUS),
      startTime: row.START_TIME,
      endTime: row.END_TIME,
      currentBid: Number(row.CURRENT_BID_EGP) || 0
    }));

    res.json({ auctions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr.message);
      }
    }
  }
});

// GET /api/auctions/:id - Get auction details
router.get('/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT
        a.id AS auction_id,
        a.vehicle_id,
        a.seller_id,
        a.status,
        a.start_time,
        a.end_time,
        a.current_bid_egp,
        a.min_bid_increment,
        a.bid_count,
        v.make,
        v.model,
        v.year_mfg,
        v.mileage_km,
        v.car_condition,
        v.price_egp,
        v.vin,
        v.plate_number,
        v.description,
        v.location_city,
        v.features,
        v.images
      FROM auctions a
      JOIN vehicles v ON v.id = a.vehicle_id
      WHERE a.id = :auctionId`,
      { auctionId: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    const row = result.rows[0];
    const featuresRaw = row.FEATURES;
    let features = [];
    if (typeof featuresRaw === 'string') {
      try {
        features = JSON.parse(featuresRaw);
      } catch (e) {
        features = [];
      }
    }

    const conditionValue = typeof row.CAR_CONDITION === 'string'
      ? row.CAR_CONDITION.toLowerCase()
      : '';

    const conditionMap = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor'
    };

    // Parse vehicle images from VEHICLES.IMAGES column
    let images = parseImagesColumn(row.IMAGES);

    res.json({
      _id: row.AUCTION_ID,
      vehicleId: {
        id: row.VEHICLE_ID,
        make: row.MAKE,
        model: row.MODEL,
        year: Number(row.YEAR_MFG) || 0,
        mileage: Number(row.MILEAGE_KM) || 0,
        vin: row.VIN,
        condition: conditionMap[conditionValue] || 'Good',
        description: row.DESCRIPTION || '',
        images,
        location: row.LOCATION_CITY || '',
        features
      },
      sellerId: row.SELLER_ID,
      currentBid: Number(row.CURRENT_BID_EGP) || 0,
      startPrice: Number(row.PRICE_EGP) || 0,
      reservePrice: Number(row.PRICE_EGP) || 0,
      bidCount: Number(row.BID_COUNT) || 0,
      minBidIncrement: Number(row.MIN_BID_INCREMENT) || 50,
      endTime: row.END_TIME,
      status: normalizeAuctionStatus(row.STATUS)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr.message);
      }
    }
  }
});

// GET /api/auctions/:id/bids - List recent bids for an auction
router.get('/:id/bids', async (req, res) => {
  let connection;
  try {
    const limitNum = Math.max(1, parseInt(req.query.limit, 10) || 20);
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT
        b.id,
        b.bidder_id,
        b.amount_egp,
        b.created_at,
        u.first_name,
        u.last_name
      FROM bids b
      JOIN users u ON u.id = b.bidder_id
      WHERE b.auction_id = :auctionId
      ORDER BY b.created_at DESC
      FETCH FIRST :limit ROWS ONLY`,
      { auctionId: req.params.id, limit: limitNum },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const bids = (result.rows || []).map((row) => ({
      id: row.ID,
      userId: row.BIDDER_ID,
      userName: `${row.FIRST_NAME || ''} ${row.LAST_NAME || ''}`.trim() || 'Bidder',
      amount: Number(row.AMOUNT_EGP) || 0,
      timestamp: row.CREATED_AT
    }));

    res.json({ bids });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Oracle connection close error:', closeErr.message);
      }
    }
  }
});

// POST /api/auctions/:id/bids - Place a manual bid
router.post('/:id/bids', auth, rateLimitBid, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid bid amount' });
    }

    // Use bidProcessingService to handle all bid logic
    const result = await bidProcessingService.processBid({
      auctionId: req.params.id,
      bidderId: req.user.id,
      amount,
      bidSource: 'manual'
    });

    // Emit real-time update to all clients watching this auction
    const io = getIO();
    io.to(`auction:${req.params.id}`).emit('bid_placed', {
      auctionId: req.params.id,
      bid: {
        id: result.bidId,
        bidderId: result.anonymizedBidder,
        amount: result.newCurrentBid,
        timestamp: new Date().toISOString()
      },
      auction: {
        currentBid: result.newCurrentBid,
        bidCount: result.bidCount,
        endTime: result.newEndTime || result.originalEndTime
      }
    });

    // If there was a previous bidder, notify them
    if (result.previousLeadingBidderId && result.previousLeadingBidderId !== req.user.id) {
      io.to(`user:${result.previousLeadingBidderId}`).emit('user_outbid', {
        auctionId: req.params.id,
        newBid: result.newCurrentBid,
        yourBid: result.previousBid
      });
    }

    res.json({
      success: true,
      bid: {
        id: result.bidId,
        userId: req.user.id,
        amount: result.newCurrentBid,
        timestamp: new Date().toISOString()
      },
      currentBid: result.newCurrentBid,
      extended: result.wasExtended,
      newEndTime: result.newEndTime
    });
  } catch (err) {
    console.error('[Auction Routes] Bid error:', err.message);
    
    // Handle specific error messages from bidProcessingService
    if (err.message.includes('not found')) {
      return res.status(404).json({ msg: err.message });
    }
    if (err.message.includes('cannot bid') || err.message.includes('not open') || err.message.includes('Minimum bid')) {
      return res.status(400).json({ msg: err.message });
    }
    if (err.message.includes('not authorized')) {
      return res.status(403).json({ msg: err.message });
    }
    
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
