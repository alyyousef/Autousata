const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { randomUUID } = require('crypto');
const { authenticate: auth } = require('../middleware/auth');
// 1. Import the upload middleware
const { upload, uploadToS3 } = require('../middleware/uploadMiddleware');

// GET /api/vehicles - List user's vehicles
router.get('/', auth, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    // 2. Updated SELECT to include 'images'
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
        status,
        images
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

      // 3. Parse Images safely
      const imagesRaw = row.IMAGES;
      let images = [];
      if (typeof imagesRaw === 'string') {
        try {
          images = JSON.parse(imagesRaw);
        } catch (e) {
          images = [];
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
        images: images, // Return the parsed images array
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
// 4. Added upload.array to handle up to 10 images
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  let connection;
  try {
    // 5. Upload Images to S3 Loop
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploading ${req.files.length} images to S3...`);
      for (const file of req.files) {
        // 'vehicles' corresponds to your ARN folder structure
        const url = await uploadToS3(file, 'vehicles');
        if (url) imageUrls.push(url);
      }
    }

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
    
    // Parse Features
    let featuresJson = '[]';
    if (typeof features === 'string') {
        featuresJson = features; 
    } else if (Array.isArray(features)) {
        featuresJson = JSON.stringify(features);
    }

    // 6. Prepare Images JSON
    const imagesJson = JSON.stringify(imageUrls);

    // 7. Insert with Images
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
        features,
        images
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
        :features,
        :images
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
        features: featuresJson,
        images: imagesJson // Bind the JSON string of URLs
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
      images: imageUrls, // Return the new URLs immediately
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

// ──── PUBLIC BROWSE ENDPOINTS (no auth) ────
// IMPORTANT: These must be defined BEFORE /:id to avoid Express matching "browse" as a param

// GET /api/vehicles/browse - List active fixed-price vehicles (public)
router.get('/browse', async (req, res) => {
  let connection;
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const offset = (page - 1) * limit;

    const { make, minPrice, maxPrice, bodyType, sort } = req.query;

    let whereClause = `WHERE v.status = 'active'
      AND v.id NOT IN (SELECT vehicle_id FROM auctions WHERE status NOT IN ('cancelled'))`;
    const binds = {};

    if (make) {
      whereClause += ` AND LOWER(v.make) = LOWER(:make)`;
      binds.make = make;
    }
    if (minPrice) {
      whereClause += ` AND v.price_egp >= :minPrice`;
      binds.minPrice = Number(minPrice);
    }
    if (maxPrice) {
      whereClause += ` AND v.price_egp <= :maxPrice`;
      binds.maxPrice = Number(maxPrice);
    }
    if (bodyType) {
      whereClause += ` AND LOWER(v.body_type) = LOWER(:bodyType)`;
      binds.bodyType = bodyType;
    }

    let orderBy = 'ORDER BY v.published_at DESC NULLS LAST';
    if (sort === 'price_asc') orderBy = 'ORDER BY v.price_egp ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY v.price_egp DESC';
    else if (sort === 'year_desc') orderBy = 'ORDER BY v.year_mfg DESC';

    connection = await oracledb.getConnection();

    const countResult = await connection.execute(
      `SELECT COUNT(*) AS total FROM vehicles v ${whereClause}`,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const total = countResult.rows[0].TOTAL;

    const dataResult = await connection.execute(
      `SELECT v.id, v.seller_id, v.make, v.model, v.year_mfg, v.mileage_km,
              v.color, v.body_type, v.transmission, v.fuel_type, v.seats,
              v.car_condition, v.price_egp, v.description, v.location_city,
              v.features, v.status, v.published_at,
              u.first_name AS seller_first_name
       FROM vehicles v
       LEFT JOIN users u ON v.seller_id = u.id
       ${whereClause}
       ${orderBy}
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { ...binds, offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const conditionMap = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' };

    const vehicles = (dataResult.rows || []).map((row) => {
      let features = [];
      if (typeof row.FEATURES === 'string') {
        try { features = JSON.parse(row.FEATURES); } catch (e) { features = []; }
      }
      const conditionValue = typeof row.CAR_CONDITION === 'string' ? row.CAR_CONDITION.toLowerCase() : '';
      return {
        _id: row.ID,
        sellerId: row.SELLER_ID,
        sellerName: row.SELLER_FIRST_NAME || 'Seller',
        make: row.MAKE,
        model: row.MODEL,
        year: Number(row.YEAR_MFG) || 0,
        mileage: Number(row.MILEAGE_KM) || 0,
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
        status: row.STATUS,
        saleType: 'fixed_price'
      };
    });

    res.json({ vehicles, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Browse vehicles error:', err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

// GET /api/vehicles/browse/:id - Get single public vehicle detail
router.get('/browse/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT v.id, v.seller_id, v.make, v.model, v.year_mfg, v.mileage_km,
              v.vin, v.plate_number, v.color, v.body_type, v.transmission,
              v.fuel_type, v.seats, v.car_condition, v.price_egp, v.description,
              v.location_city, v.features, v.status, v.published_at,
              u.first_name AS seller_first_name
       FROM vehicles v
       LEFT JOIN users u ON v.seller_id = u.id
       WHERE v.id = :vehicleId AND v.status = 'active'
         AND v.id NOT IN (SELECT vehicle_id FROM auctions WHERE status NOT IN ('cancelled'))`,
      { vehicleId: req.params.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ msg: 'Vehicle not found or not available for direct purchase' });
    }

    const row = result.rows[0];
    let features = [];
    if (typeof row.FEATURES === 'string') {
      try { features = JSON.parse(row.FEATURES); } catch (e) { features = []; }
    }
    const conditionMap = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' };
    const conditionValue = typeof row.CAR_CONDITION === 'string' ? row.CAR_CONDITION.toLowerCase() : '';

    res.json({
      _id: row.ID,
      sellerId: row.SELLER_ID,
      sellerName: row.SELLER_FIRST_NAME || 'Seller',
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
      status: row.STATUS,
      saleType: 'fixed_price'
    });
  } catch (err) {
    console.error('Browse vehicle detail error:', err.message);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e.message); }
    }
  }
});

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', auth, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();

    // 8. Updated SELECT to include 'images'
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
        status,
        images
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

    // 9. Parse Images safely
    const imagesRaw = row.IMAGES;
    let images = [];
    if (typeof imagesRaw === 'string') {
      try {
        images = JSON.parse(imagesRaw);
      } catch (e) {
        images = [];
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
      images: images,
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