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
        mileage_km,
        vin,
        plate_number,
        color,
        body_type,
        transmission,
        fuel_type,
        seats,
        car_condition,
        price_egp,
        description,
        location_city,
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
        mileage: Number(row.MILEAGE_KM) || 0,
        vin: row.VIN,
        plateNumber: row.PLATE_NUMBER,
        color: row.COLOR,
        bodyType: row.BODY_TYPE,
        transmission: row.TRANSMISSION,
        fuelType: row.FUEL_TYPE,
        seats: Number(row.SEATS) || 0,
        condition: conditionMap[conditionValue] || 'Good',
        price: Number(row.PRICE_EGP) || 0,
        description: row.DESCRIPTION || '',
        location: row.LOCATION_CITY || '',
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
      mileage,
      mileageKm,
      mileage_km,
      vin,
      plateNumber,
      plate_number,
      color,
      bodyType,
      body_type,
      transmission,
      fuelType,
      fuel_type,
      seats,
      condition,
      price,
      reservePrice,
      description,
      location,
      location_city,
      features
    } = req.body;

    const normalizedMileage = mileage ?? mileageKm ?? mileage_km;
    const normalizedPrice = price ?? reservePrice;
    const normalizedBodyType = bodyType ?? body_type;
    const normalizedFuelType = fuelType ?? fuel_type;
    const normalizedPlateNumber = plateNumber ?? plate_number;
    const normalizedLocation = location ?? location_city;

    const missingFields = [];
    if (!make) missingFields.push('make');
    if (!model) missingFields.push('model');
    if (!year) missingFields.push('year');
    if (normalizedMileage === undefined) missingFields.push('mileage');
    if (!color) missingFields.push('color');
    if (!normalizedBodyType) missingFields.push('bodyType');
    if (!transmission) missingFields.push('transmission');
    if (!normalizedFuelType) missingFields.push('fuelType');
    if (seats === undefined) missingFields.push('seats');
    if (!condition) missingFields.push('condition');
    if (normalizedPrice === undefined) missingFields.push('price');
    if (!description) missingFields.push('description');
    if (!normalizedLocation) missingFields.push('location');

    if (missingFields.length > 0) {
      return res.status(400).json({
        msg: 'Missing required vehicle fields',
        missingFields
      });
    }

    connection = await oracledb.getConnection();

    const existingVehicle = await connection.execute(
      `SELECT id FROM vehicles WHERE vin = :vin OR plate_number = :plateNumber`,
      { vin, plateNumber: normalizedPlateNumber },
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
        mileage_km,
        color,
        body_type,
        transmission,
        fuel_type,
        seats,
        car_condition,
        price_egp,
        currency,
        description,
        location_city,
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
        :mileageKm,
        :color,
        :bodyType,
        :transmission,
        :fuelType,
        :seats,
        :condition,
        :priceEgp,
        :currency,
        :description,
        :locationCity,
        :features
      )`,
      {
        id: vehicleId,
        sellerId: req.user.id,
        vin,
        plateNumber: normalizedPlateNumber,
        status: 'draft',
        make,
        model,
        yearMfg: Number(year),
        mileageKm: Number(normalizedMileage) || 0,
        color,
        bodyType: normalizedBodyType,
        transmission,
        fuelType: normalizedFuelType,
        seats: Number(seats) > 0 ? Number(seats) : 5,
        condition: conditionValue,
        priceEgp: Number(normalizedPrice) || 0,
        currency: 'EGP',
        description,
        locationCity: normalizedLocation,
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
      mileage: Number(normalizedMileage) || 0,
      vin,
      plateNumber: normalizedPlateNumber,
      color,
      bodyType: normalizedBodyType,
      transmission,
      fuelType: normalizedFuelType,
      seats: Number(seats) > 0 ? Number(seats) : 5,
      condition: condition,
      price: Number(normalizedPrice) || 0,
      description,
      location: normalizedLocation,
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
        mileage_km,
        description,
        vin,
        plate_number,
        color,
        body_type,
        transmission,
        fuel_type,
        seats,
        car_condition,
        price_egp,
        location_city,
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
      mileage: Number(row.MILEAGE_KM) || 0,
      vin: row.VIN,
      plateNumber: row.PLATE_NUMBER,
      color: row.COLOR,
      bodyType: row.BODY_TYPE,
      transmission: row.TRANSMISSION,
      fuelType: row.FUEL_TYPE,
      seats: Number(row.SEATS) || 0,
      condition: conditionMap[conditionValue] || 'Good',
      price: Number(row.PRICE_EGP) || 0,
      description: row.DESCRIPTION || '',
      location: row.LOCATION_CITY || '',
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
