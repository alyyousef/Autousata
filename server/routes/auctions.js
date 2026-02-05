const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { randomUUID } = require('crypto');
const { authenticate: auth } = require('../middleware/auth');

// POST /api/auctions - Create a new auction
router.post('/', auth, async (req, res) => {
  let connection;
  try {
    const {
      vehicleId,
      startTime,
      endTime,
      startPrice,
      reservePrice
    } = req.body;

    if (!vehicleId || !startTime || !endTime || startPrice === undefined || reservePrice === undefined) {
      return res.status(400).json({ msg: 'Missing required auction fields' });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ msg: 'Invalid start or end time' });
    }

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
        startTime: startDate,
        endTime: endDate,
        originalEndTime: endDate,
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
      startTime: startDate,
      endTime: endDate,
      originalEndTime: endDate,
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
       WHERE LOWER(a.status) = 'live'`,
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
        v.make,
        v.model,
        v.year_mfg,
        v.car_condition,
        v.price_egp,
        v.vin,
        v.plate_number,
        v.features,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
      FROM auctions a
      JOIN vehicles v ON v.id = a.vehicle_id
      WHERE LOWER(a.status) = 'live'
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

      return {
        _id: row.AUCTION_ID,
        vehicleId: {
          id: row.VEHICLE_ID,
          make: row.MAKE,
          model: row.MODEL,
          year: Number(row.YEAR_MFG) || 0,
          mileage: 0,
          vin: row.VIN,
          condition: conditionMap[conditionValue] || 'Good',
          description: '',
          images: [],
          location: '',
          features
        },
        sellerId: row.SELLER_ID,
        currentBid: Number(row.CURRENT_BID_EGP) || 0,
        startPrice: Number(row.PRICE_EGP) || 0,
        reservePrice: Number(row.PRICE_EGP) || 0,
        bidCount: Number(row.BID_COUNT) || 0,
        endTime: row.END_TIME,
        status: row.STATUS
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
      status: row.STATUS,
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
        v.make,
        v.model,
        v.year_mfg,
        v.car_condition,
        v.price_egp,
        v.vin,
        v.plate_number,
        v.features,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
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

    res.json({
      _id: row.AUCTION_ID,
      vehicleId: {
        id: row.VEHICLE_ID,
        make: row.MAKE,
        model: row.MODEL,
        year: Number(row.YEAR_MFG) || 0,
        mileage: 0,
        vin: row.VIN,
        condition: conditionMap[conditionValue] || 'Good',
        description: '',
        images: [],
        location: '',
        features
      },
      sellerId: row.SELLER_ID,
      currentBid: Number(row.CURRENT_BID_EGP) || 0,
      startPrice: Number(row.PRICE_EGP) || 0,
      reservePrice: Number(row.PRICE_EGP) || 0,
      bidCount: Number(row.BID_COUNT) || 0,
      endTime: row.END_TIME,
      status: row.STATUS
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

module.exports = router;
