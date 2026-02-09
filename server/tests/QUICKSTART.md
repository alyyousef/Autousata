# Quick Start: Testing Auction API

## 1. Start Your Server
```bash
cd server
npm start
```

## 2. Run Automated Tests
```bash
node server/tests/auction-api.test.js
```

## 3. OR Import Postman Collection
1. Open Postman
2. Click "Import"
3. Select `server/tests/AUTOUSATA-Auction-API.postman_collection.json`
4. Run requests in order:
   - Authentication → Register/Login
   - Vehicles → Create Test Vehicle
   - Auctions → All auction endpoints

## Expected Results

### ✅ All tests should pass:
- Database schema validation (AUCTIONS, BIDS, VEHICLES tables)
- Create auction
- Get auctions list
- Get auction by ID
- Place bids
- Get bid history

### ⚠️ Common Issues:

**"Connection Error"**
→ Check Oracle database is running and config/db.js is correct

**"Authentication Failed"**
→ Run "Register User" first, then "Login User"

**"Bid placement failed"**
→ Auction must be in 'live' status (not 'draft')

## Database Schema Compatibility

Your DATABASE.md schema is fully supported! The tests validate:

✓ AUCTIONS table structure
✓ BIDS table structure  
✓ VEHICLES integration
✓ Foreign key relationships
✓ Required indexes
✓ Status constraints

## Need Help?

- Check [server/tests/README.md](./README.md) for detailed guide
- Review [DATABASE.md](../DATABASE.md) for schema reference
- Check server logs for errors

---
**Ready to test?** Run: `node server/tests/auction-api.test.js`
