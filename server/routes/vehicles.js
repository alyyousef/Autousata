const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { randomUUID } = require('crypto');
const { authenticate: auth } = require('../middleware/auth');

// GET /api/vehicles - List user's vehicles
router.get('/', auth, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT
        id,
        seller_id,
        make,
        model,
        year_mfg,
        vin,
        plate_number,
        car_condition,
        price_egp,
        features,
        status
      FROM vehicles
      WHERE seller_id = :sellerId`,
      { sellerId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const conditionMap = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor'
    };

    const vehicles = (result.rows || []).map((row) => {
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

      return {
        _id: row.ID,
        sellerId: row.SELLER_ID,
        make: row.MAKE,
        model: row.MODEL,
        year: Number(row.YEAR_MFG) || 0,
        mileage: 0,
        vin: row.VIN,
        plateNumber: row.PLATE_NUMBER,
        condition: conditionMap[conditionValue] || 'Good',
        price: Number(row.PRICE_EGP) || 0,
        description: '',
        location: '',
        features,
        images: [],
        status: row.STATUS
      };
    });

    res.json(vehicles);
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

// POST /api/vehicles - Create a new vehicle listing
router.post('/', auth, async (req, res) => {
  let connection;
  try {
    const {
      make,
      model,
      year,
      vin,
      plateNumber,
      condition,
      price,
      features
    } = req.body;

    if (!make || !model || !year || !vin || !plateNumber || !condition || price === undefined) {
      return res.status(400).json({ msg: 'Missing required vehicle fields' });
    }

    connection = await oracledb.getConnection();

    const existingVehicle = await connection.execute(
      `SELECT id FROM vehicles WHERE vin = :vin OR plate_number = :plateNumber`,
      { vin, plateNumber },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existingVehicle.rows && existingVehicle.rows.length > 0) {
      return res.status(400).json({ msg: 'Vehicle with this VIN or Plate Number already exists' });
    }

    const vehicleId = randomUUID();
    const conditionValue = typeof condition === 'string' ? condition.toLowerCase() : 'good';
    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : '[]';

    await connection.execute(
      `INSERT INTO vehicles (
        id,
        seller_id,
        vin,
        plate_number,
        status,
        make,
        model,
        year_mfg,
        car_condition,
        price_egp,
        features
      ) VALUES (
        :id,
        :sellerId,
        :vin,
        :plateNumber,
        :status,
        :make,
        :model,
        :yearMfg,
        :condition,
        :priceEgp,
        :features
      )`,
      {
        id: vehicleId,
        sellerId: req.user.id,
        vin,
        plateNumber,
        status: 'draft',
        make,
        model,
        yearMfg: Number(year),
        condition: conditionValue,
        priceEgp: Number(price) || 0,
        features: featuresJson
      },
      { autoCommit: true }
    );

    res.json({
      _id: vehicleId,
      sellerId: req.user.id,
      make,
      model,
      year: Number(year) || 0,
      mileage: 0,
      vin,
      plateNumber,
      condition: condition,
      price: Number(price) || 0,
      description: '',
      location: '',
      features: Array.isArray(features) ? features : [],
      images: [],
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

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', auth, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT
        id,
        seller_id,
        make,
        model,
        year_mfg,
        vin,
        plate_number,
        car_condition,
        price_egp,
        features,
        status
      FROM vehicles
      WHERE id = :vehicleId AND seller_id = :sellerId`,
      { vehicleId: req.params.id, sellerId: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ msg: 'Vehicle not found' });
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
      _id: row.ID,
      sellerId: row.SELLER_ID,
      make: row.MAKE,
      model: row.MODEL,
      year: Number(row.YEAR_MFG) || 0,
      mileage: 0,
      vin: row.VIN,
      plateNumber: row.PLATE_NUMBER,
      condition: conditionMap[conditionValue] || 'Good',
      price: Number(row.PRICE_EGP) || 0,
      description: '',
      location: '',
      features,
      images: [],
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
