# Auction API Testing Guide

This directory contains comprehensive tests for the AUTOUSATA auction system API endpoints and database schema validation.

## Test Files

### `auction-api.test.js`
Main test suite that validates:
- Database schema compatibility with [DATABASE.md](../DATABASE.md)
- All auction API endpoints
- Authentication flows
- Data integrity

## Prerequisites

1. **Oracle Database Running**
   - Ensure your Oracle database is running and accessible
   - Update connection details in `server/config/db.js`

2. **Server Running**
   - Start the server: `npm start` or `npm run dev`
   - Default URL: `http://localhost:5000`

3. **Dependencies Installed**
   ```bash
   npm install
   ```

## Running Tests

### Quick Run
```bash
node server/tests/auction-api.test.js
```

### With Custom API URL
```bash
TEST_API_URL=http://localhost:5000 node server/tests/auction-api.test.js
```

### With NPM Script (add to package.json)
```json
{
  "scripts": {
    "test:auctions": "node server/tests/auction-api.test.js"
  }
}
```

Then run:
```bash
npm run test:auctions
```

## Test Coverage

### Database Schema Tests ✓
- [x] AUCTIONS table structure validation
- [x] BIDS table structure validation
- [x] VEHICLES table compatibility check
- [x] Index validation (performance optimization)
- [x] Foreign key constraints verification
- [x] Status constraint validation

### API Endpoint Tests ✓
- [x] `POST /api/auctions` - Create auction
- [x] `GET /api/auctions` - List auctions with pagination & sorting
- [x] `GET /api/auctions/:id` - Get auction details
- [x] `GET /api/auctions/seller` - Get seller's auctions
- [x] `GET /api/auctions/:id/bids` - Get bid history
- [x] `POST /api/auctions/:id/bids` - Place bid (manual)

### Authentication Tests ✓
- [x] User login
- [x] Test user creation (fallback)
- [x] JWT token validation

## Test Output

The test suite provides detailed output with color-coded results:

```
============================================================
  AUTOUSATA AUCTION API TEST SUITE
============================================================

============================================================
  DATABASE SCHEMA VALIDATION
============================================================
✓ AUCTIONS table has all required columns
✓ BIDS table has all required columns
✓ VEHICLES table has all required columns
✓ Recommended indexes are present
✓ Foreign key and primary key constraints validated

============================================================
  AUTHENTICATION SETUP
============================================================
✓ Authentication successful
ℹ User ID: abc123-def456-...

============================================================
  TEST SUMMARY
============================================================
Total Tests: 12
Passed: 12
Failed: 0
Success Rate: 100.00%
```

## Database Schema Requirements

Based on [DATABASE.md](../DATABASE.md), the tests validate:

### AUCTIONS Table (Required Columns)
- `ID` (VARCHAR2(36)) - Primary Key
- `VEHICLE_ID` (VARCHAR2(36)) - Foreign Key to VEHICLES
- `SELLER_ID` (VARCHAR2(36)) - Foreign Key to USERS
- `STATUS` (VARCHAR2(20)) - Check constraint
- `START_TIME` (TIMESTAMP)
- `END_TIME` (TIMESTAMP)
- `RESERVE_PRICE_EGP` (NUMBER(15,2))
- `STARTING_BID_EGP` (NUMBER(15,2))
- `CURRENT_BID_EGP` (NUMBER(15,2))
- `BID_COUNT` (NUMBER(10))
- `MIN_BID_INCREMENT` (NUMBER(12,2))
- `LEADING_BIDDER_ID` (VARCHAR2(36))
- `WINNER_ID` (VARCHAR2(36))
- `PAYMENT_ID` (VARCHAR2(36))

### BIDS Table (Required Columns)
- `ID` (VARCHAR2(36)) - Primary Key
- `AUCTION_ID` (VARCHAR2(36)) - Foreign Key to AUCTIONS
- `BIDDER_ID` (VARCHAR2(36)) - Foreign Key to USERS
- `AMOUNT_EGP` (NUMBER(15,2))
- `STATUS` (VARCHAR2(20))
- `CREATED_AT` (TIMESTAMP)

### Recommended Indexes
- `IDX_AUCTIONS_STATUS_ENDTIME` - Composite index for scheduler queries
- `IDX_BIDS_AUCTION_TIME` - Composite index for bid history

## Expected Response Formats

### Create Auction Response
```json
{
  "_id": "uuid",
  "vehicleId": "uuid",
  "sellerId": "uuid",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T12:00:00Z",
  "startPrice": 800000,
  "reservePrice": 850000,
  "currentBid": 800000,
  "bidCount": 0,
  "status": "draft"
}
```

### Get Auctions Response
```json
{
  "auctions": [{
    "_id": "uuid",
    "vehicleId": {
      "id": "uuid",
      "make": "BMW",
      "model": "M3",
      "year": 2022,
      "mileage": 15000,
      "condition": "Excellent"
    },
    "currentBid": 850000,
    "bidCount": 5,
    "endTime": "2024-01-01T12:00:00Z",
    "status": "live"
  }],
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

## Troubleshooting

### Connection Errors
```
Error: ORA-12154: TNS:could not resolve the connect identifier specified
```
**Solution**: Check `server/config/db.js` and ensure Oracle connection details are correct.

### Authentication Failures
```
✗ Authentication setup: Request failed with status code 401
```
**Solution**: 
1. Check if the server is running
2. Verify JWT_SECRET in `.env`
3. Test user credentials might need to be updated

### Schema Validation Failures
```
✗ AUCTIONS table schema validation: Missing columns: PAYMENT_DEADLINE
```
**Solution**: Run the latest database migrations:
```bash
sqlplus username/password@database < server/migrations/001_stripe_payment_integration.sql
sqlplus username/password@database < server/migrations/002_realtime_auction_system.sql
```

### Vehicle Creation Failures
```
✗ Test vehicle creation: Request failed with status code 404
```
**Solution**: Ensure the vehicles API endpoint exists. Update the test to use a pre-existing vehicle ID if needed.

## Manual Testing with Postman/cURL

### Create Auction
```bash
curl -X POST http://localhost:5000/api/auctions \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{
    "vehicleId": "uuid",
    "startTime": "2024-12-01T10:00:00Z",
    "endTime": "2024-12-01T12:00:00Z",
    "startPrice": 800000,
    "reservePrice": 850000
  }'
```

### Get Auctions
```bash
curl http://localhost:5000/api/auctions?page=1&limit=10&sortBy=endingSoon
```

### Get Auction by ID
```bash
curl http://localhost:5000/api/auctions/{auction-id}
```

### Place Bid
```bash
curl -X POST http://localhost:5000/api/auctions/{auction-id}/bids \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{ "amount": 850000 }'
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Auction API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      oracle:
        image: gvenzl/oracle-xe:21-slim
        env:
          ORACLE_PASSWORD: password
        ports:
          - 1521:1521
    
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run migrations
        run: npm run migrate
      - name: Start server
        run: npm start &
      - name: Run auction tests
        run: npm run test:auctions
```

## Contributing

When adding new auction features:

1. Update the test suite to cover new endpoints
2. Add schema validation for new columns/tables
3. Update this README with new test cases
4. Ensure all tests pass before merging

## Support

For issues or questions:
- Check the main [DATABASE.md](../DATABASE.md) documentation
- Review server logs: `server/logs/`
- Contact the development team

---

**Last Updated**: February 2026
**Test Coverage**: 12 test cases
**Database Schema Version**: Migration 002 (Real-time Auctions)
