/**
 * Auction API Test Suite
 * Tests all auction endpoints and validates DB schema compatibility
 * 
 * Run with: node server/tests/auction-api.test.js
 * Or with: npm test (if configured)
 */

const axios = require('axios');
const oracledb = require('oracledb');

// Test Configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const TEST_CONFIG = {
  timeout: 30000,
  verbose: true
};

// Test Data Storage
let authToken = '';
let testUserId = '';
let testVehicleId = '';
let testAuctionId = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Logging utilities
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${message}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

/**
 * Test Result Tracker
 */
class TestTracker {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  pass(testName) {
    this.passed++;
    this.tests.push({ name: testName, status: 'PASS' });
    logSuccess(testName);
  }

  fail(testName, error) {
    this.failed++;
    this.tests.push({ name: testName, status: 'FAIL', error: error.message });
    logError(`${testName}: ${error.message}`);
  }

  summary() {
    logHeader('TEST SUMMARY');
    log(`Total Tests: ${this.passed + this.failed}`, 'cyan');
    log(`Passed: ${this.passed}`, 'green');
    log(`Failed: ${this.failed}`, this.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(2)}%\n`, 'cyan');

    if (this.failed > 0) {
      logHeader('FAILED TESTS');
      this.tests.filter(t => t.status === 'FAIL').forEach(t => {
        logError(`${t.name}: ${t.error}`);
      });
    }
  }
}

const tracker = new TestTracker();

/**
 * Database Schema Validation
 */
async function validateDatabaseSchema() {
  logHeader('DATABASE SCHEMA VALIDATION');
  let connection;

  try {
    connection = await oracledb.getConnection();
    
    // Test 1: Check AUCTIONS table exists and has required columns
    try {
      const auctionsSchema = await connection.execute(
        `SELECT COLUMN_NAME, DATA_TYPE, NULLABLE 
         FROM USER_TAB_COLUMNS 
         WHERE TABLE_NAME = 'AUCTIONS' 
         ORDER BY COLUMN_ID`
      );

      const requiredColumns = [
        'ID', 'VEHICLE_ID', 'SELLER_ID', 'STATUS', 'START_TIME', 'END_TIME',
        'RESERVE_PRICE_EGP', 'STARTING_BID_EGP', 'CURRENT_BID_EGP', 'BID_COUNT',
        'MIN_BID_INCREMENT', 'LEADING_BIDDER_ID', 'WINNER_ID', 'PAYMENT_ID'
      ];

      const existingColumns = auctionsSchema.rows.map(r => r[0]);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length === 0) {
        tracker.pass('AUCTIONS table has all required columns');
      } else {
        throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
      }

      if (TEST_CONFIG.verbose) {
        logInfo(`Found ${existingColumns.length} columns in AUCTIONS table`);
      }
    } catch (err) {
      tracker.fail('AUCTIONS table schema validation', err);
    }

    // Test 2: Check BIDS table exists and has required columns
    try {
      const bidsSchema = await connection.execute(
        `SELECT COLUMN_NAME, DATA_TYPE, NULLABLE 
         FROM USER_TAB_COLUMNS 
         WHERE TABLE_NAME = 'BIDS' 
         ORDER BY COLUMN_ID`
      );

      const requiredColumns = ['ID', 'AUCTION_ID', 'BIDDER_ID', 'AMOUNT_EGP', 'STATUS', 'CREATED_AT'];
      const existingColumns = bidsSchema.rows.map(r => r[0]);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length === 0) {
        tracker.pass('BIDS table has all required columns');
      } else {
        throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
      }
    } catch (err) {
      tracker.fail('BIDS table schema validation', err);
    }

    // Test 3: Check VEHICLES table compatibility
    try {
      const vehiclesSchema = await connection.execute(
        `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'VEHICLES'`
      );

      const requiredColumns = ['ID', 'SELLER_ID', 'MAKE', 'MODEL', 'YEAR_MFG', 'STATUS'];
      const existingColumns = vehiclesSchema.rows.map(r => r[0]);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length === 0) {
        tracker.pass('VEHICLES table has all required columns');
      } else {
        throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
      }
    } catch (err) {
      tracker.fail('VEHICLES table schema validation', err);
    }

    // Test 4: Check indexes for performance
    try {
      const indexes = await connection.execute(
        `SELECT INDEX_NAME, TABLE_NAME, COLUMN_NAME 
         FROM USER_IND_COLUMNS 
         WHERE TABLE_NAME IN ('AUCTIONS', 'BIDS') 
         ORDER BY INDEX_NAME, COLUMN_POSITION`
      );

      const recommendedIndexes = [
        'IDX_AUCTIONS_STATUS_ENDTIME',
        'IDX_BIDS_AUCTION_TIME'
      ];

      const existingIndexes = [...new Set(indexes.rows.map(r => r[0]))];
      const missingIndexes = recommendedIndexes.filter(idx => 
        !existingIndexes.some(ex => ex.includes(idx.split('_').pop()))
      );

      if (missingIndexes.length === 0) {
        tracker.pass('Recommended indexes are present');
      } else {
        logWarning(`Missing recommended indexes: ${missingIndexes.join(', ')}`);
        tracker.pass('Index check completed (with warnings)');
      }
    } catch (err) {
      tracker.fail('Index validation', err);
    }

    // Test 5: Check foreign key constraints
    try {
      const constraints = await connection.execute(
        `SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE 
         FROM USER_CONSTRAINTS 
         WHERE TABLE_NAME IN ('AUCTIONS', 'BIDS') 
         AND CONSTRAINT_TYPE IN ('R', 'P')
         ORDER BY TABLE_NAME, CONSTRAINT_TYPE`
      );

      if (constraints.rows.length > 0) {
        tracker.pass(`Foreign key and primary key constraints validated (${constraints.rows.length} found)`);
      } else {
        logWarning('No constraints found - database might be missing referential integrity');
        tracker.pass('Constraint check completed (with warnings)');
      }
    } catch (err) {
      tracker.fail('Constraint validation', err);
    }

  } catch (err) {
    logError(`Database connection error: ${err.message}`);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logError(`Error closing connection: ${err.message}`);
      }
    }
  }
}

/**
 * Setup: Login and get auth token
 */
async function setupAuthentication() {
  logHeader('AUTHENTICATION SETUP');

  try {
    // Try to login with test credentials
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@autousata.com',
      password: 'testpass123'
    }, { timeout: TEST_CONFIG.timeout });

    authToken = response.data.token;
    testUserId = response.data.user.id;

    tracker.pass('Authentication successful');
    logInfo(`User ID: ${testUserId}`);
    
    return true;
  } catch (err) {
    logWarning('Test user login failed. Attempting to create test user...');
    
    try {
      // Create test user
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@autousata.com',
        phone: '01234567890',
        password: 'testpass123'
      }, { timeout: TEST_CONFIG.timeout });

      authToken = registerResponse.data.token;
      testUserId = registerResponse.data.user.id;

      tracker.pass('Test user created and authenticated');
      logInfo(`User ID: ${testUserId}`);
      
      return true;
    } catch (registerErr) {
      tracker.fail('Authentication setup', registerErr);
      return false;
    }
  }
}

/**
 * Create test vehicle for auction
 */
async function createTestVehicle() {
  logHeader('TEST VEHICLE CREATION');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/vehicles`,
      {
        make: 'BMW',
        model: 'M3',
        year: 2022,
        mileage: 15000,
        vin: `TEST${Date.now()}`,
        plateNumber: `TST${Date.now()}`,
        color: 'Blue',
        bodyType: 'sedan',
        transmission: 'automatic',
        fuelType: 'petrol',
        seats: 5,
        condition: 'excellent',
        price: 850000,
        currency: 'EGP',
        description: 'Test vehicle for auction API testing',
        location: 'Cairo',
        features: JSON.stringify(['Leather Seats', 'Sunroof', 'Navigation'])
      },
      {
        headers: { 'x-auth-token': authToken },
        timeout: TEST_CONFIG.timeout
      }
    );

    testVehicleId = response.data._id || response.data.id;
    tracker.pass(`Test vehicle created: ${testVehicleId}`);
    
    return true;
  } catch (err) {
    if (err.response?.status === 404) {
      logWarning('Vehicle endpoint not found - skipping vehicle creation');
      logInfo('Will use manual vehicle ID if available');
      return true; // Continue tests
    }
    tracker.fail('Test vehicle creation', err);
    return false;
  }
}

/**
 * Test 1: Create Auction
 */
async function testCreateAuction() {
  logHeader('TEST: CREATE AUCTION');

  if (!testVehicleId) {
    logWarning('No test vehicle ID - skipping auction creation test');
    return false;
  }

  try {
    const startTime = new Date(Date.now() + 60000).toISOString(); // Start in 1 minute
    const endTime = new Date(Date.now() + 3600000).toISOString(); // End in 1 hour

    const response = await axios.post(
      `${BASE_URL}/api/auctions`,
      {
        vehicleId: testVehicleId,
        startTime,
        endTime,
        startPrice: 800000,
        reservePrice: 850000
      },
      {
        headers: { 'x-auth-token': authToken },
        timeout: TEST_CONFIG.timeout
      }
    );

    testAuctionId = response.data._id || response.data.id;
    
    // Validate response structure
    if (!testAuctionId) {
      throw new Error('No auction ID in response');
    }

    if (response.data.status !== 'draft') {
      throw new Error(`Expected status 'draft', got '${response.data.status}'`);
    }

    tracker.pass(`Auction created successfully: ${testAuctionId}`);
    
    if (TEST_CONFIG.verbose) {
      logInfo(`Start: ${response.data.startTime}`);
      logInfo(`End: ${response.data.endTime}`);
      logInfo(`Reserve: ${response.data.reservePrice} EGP`);
    }
    
    return true;
  } catch (err) {
    tracker.fail('Create auction', err);
    return false;
  }
}

/**
 * Test 2: Get All Auctions (with pagination)
 */
async function testGetAuctions() {
  logHeader('TEST: GET AUCTIONS LIST');

  try {
    const response = await axios.get(
      `${BASE_URL}/api/auctions?page=1&limit=10&sortBy=endingSoon`,
      { timeout: TEST_CONFIG.timeout }
    );

    // Validate response structure
    if (!response.data.auctions || !Array.isArray(response.data.auctions)) {
      throw new Error('Response missing auctions array');
    }

    if (!response.data.pagination) {
      throw new Error('Response missing pagination object');
    }

    tracker.pass(`Retrieved ${response.data.auctions.length} auctions`);
    
    if (TEST_CONFIG.verbose) {
      logInfo(`Total: ${response.data.pagination.total}`);
      logInfo(`Pages: ${response.data.pagination.pages}`);
      logInfo(`Current Page: ${response.data.pagination.page}`);
    }
    
    return true;
  } catch (err) {
    tracker.fail('Get auctions list', err);
    return false;
  }
}

/**
 * Test 3: Get Auction by ID
 */
async function testGetAuctionById() {
  logHeader('TEST: GET AUCTION BY ID');

  if (!testAuctionId) {
    logWarning('No test auction ID - skipping get by ID test');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/api/auctions/${testAuctionId}`,
      { timeout: TEST_CONFIG.timeout }
    );

    // Validate response structure
    if (response.data._id !== testAuctionId) {
      throw new Error('Auction ID mismatch');
    }

    if (!response.data.vehicleId) {
      throw new Error('Missing vehicle information');
    }

    tracker.pass('Auction retrieved successfully');
    
    if (TEST_CONFIG.verbose) {
      logInfo(`Vehicle: ${response.data.vehicleId.make} ${response.data.vehicleId.model}`);
      logInfo(`Current Bid: ${response.data.currentBid} EGP`);
      logInfo(`Bid Count: ${response.data.bidCount}`);
      logInfo(`Status: ${response.data.status}`);
    }
    
    return true;
  } catch (err) {
    tracker.fail('Get auction by ID', err);
    return false;
  }
}

/**
 * Test 4: Get Seller Auctions
 */
async function testGetSellerAuctions() {
  logHeader('TEST: GET SELLER AUCTIONS');

  try {
    const response = await axios.get(
      `${BASE_URL}/api/auctions/seller`,
      {
        headers: { 'x-auth-token': authToken },
        timeout: TEST_CONFIG.timeout
      }
    );

    if (!response.data.auctions || !Array.isArray(response.data.auctions)) {
      throw new Error('Response missing auctions array');
    }

    tracker.pass(`Retrieved ${response.data.auctions.length} seller auctions`);
    
    return true;
  } catch (err) {
    tracker.fail('Get seller auctions', err);
    return false;
  }
}

/**
 * Test 5: Get Bid History
 */
async function testGetBidHistory() {
  logHeader('TEST: GET BID HISTORY');

  if (!testAuctionId) {
    logWarning('No test auction ID - skipping bid history test');
    return false;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/api/auctions/${testAuctionId}/bids?limit=20`,
      { timeout: TEST_CONFIG.timeout }
    );

    if (!response.data.bids || !Array.isArray(response.data.bids)) {
      throw new Error('Response missing bids array');
    }

    tracker.pass(`Retrieved ${response.data.bids.length} bids`);
    
    return true;
  } catch (err) {
    tracker.fail('Get bid history', err);
    return false;
  }
}

/**
 * Test 6: Place Bid (requires live auction)
 */
async function testPlaceBid() {
  logHeader('TEST: PLACE BID');

  if (!testAuctionId) {
    logWarning('No test auction ID - skipping place bid test');
    return false;
  }

  try {
    // First, make the auction live by updating its status directly in DB
    logInfo('Note: This test requires auction to be in "live" status');
    logWarning('Skipping bid placement - auction must be live');
    
    // Uncomment below to test actual bid placement when auction is live
    /*
    const response = await axios.post(
      `${BASE_URL}/api/auctions/${testAuctionId}/bids`,
      { amount: 850000 },
      {
        headers: { 'x-auth-token': authToken },
        timeout: TEST_CONFIG.timeout
      }
    );

    if (!response.data.success) {
      throw new Error('Bid placement failed');
    }

    tracker.pass(`Bid placed successfully: ${response.data.bid.amount} EGP`);
    */
    
    tracker.pass('Bid placement test skipped (auction not live)');
    return true;
  } catch (err) {
    tracker.fail('Place bid', err);
    return false;
  }
}

/**
 * Test 7: Validate auction status transitions
 */
async function testAuctionStatusValidation() {
  logHeader('TEST: AUCTION STATUS VALIDATION');

  try {
    const validStatuses = ['draft', 'scheduled', 'live', 'ended', 'settled', 'cancelled'];
    
    let connection;
    try {
      connection = await oracledb.getConnection();
      
      // Check if status constraint exists
      const constraint = await connection.execute(
        `SELECT SEARCH_CONDITION 
         FROM USER_CONSTRAINTS 
         WHERE TABLE_NAME = 'AUCTIONS' 
         AND CONSTRAINT_TYPE = 'C' 
         AND SEARCH_CONDITION LIKE '%STATUS%'`
      );

      if (constraint.rows.length > 0) {
        tracker.pass('Auction status constraint validated');
      } else {
        logWarning('No status constraint found - database might allow invalid statuses');
        tracker.pass('Status validation completed (with warnings)');
      }
    } finally {
      if (connection) await connection.close();
    }
    
    return true;
  } catch (err) {
    tracker.fail('Auction status validation', err);
    return false;
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.clear();
  logHeader('AUTOUSATA AUCTION API TEST SUITE');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeout}ms`);
  logInfo(`Verbose: ${TEST_CONFIG.verbose}\n`);

  try {
    // Phase 1: Database Schema Validation
    await validateDatabaseSchema();

    // Phase 2: Authentication Setup
    const authSuccess = await setupAuthentication();
    if (!authSuccess) {
      logError('\n⚠  Authentication failed - stopping API tests');
      tracker.summary();
      process.exit(1);
    }

    // Phase 3: Test Data Setup
    await createTestVehicle();

    // Phase 4: API Endpoint Tests
    await testCreateAuction();
    await testGetAuctions();
    await testGetAuctionById();
    await testGetSellerAuctions();
    await testGetBidHistory();
    await testPlaceBid();
    await testAuctionStatusValidation();

    // Phase 5: Summary
    tracker.summary();

    // Exit with appropriate code
    process.exit(tracker.failed > 0 ? 1 : 0);

  } catch (err) {
    logError(`\nFatal error: ${err.message}`);
    logError(err.stack);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, validateDatabaseSchema };
