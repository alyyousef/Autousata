# Real-Time Auction System - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Database Migration
```bash
# Connect to your Oracle database
sqlplus your_username/your_password@your_database

# Run the migration script
@server/migrations/002_realtime_auction_system.sql

# Verify tables were created
SELECT table_name FROM user_tables 
WHERE table_name LIKE '%WEBHOOK%';

# Expected output:
# WEBHOOK_SUBSCRIPTIONS
# WEBHOOK_DELIVERY_LOG
```

### Step 2: Verify Dependencies
```bash
# Check if Socket.IO is installed
cd server
npm list socket.io

# If not installed (you should have done this already):
npm install socket.io@4.7.0 node-cron@3.0.3

cd ../client
npm list socket.io-client

# If not installed:
npm install socket.io-client@4.7.0
```

### Step 3: Start the Server
```bash
cd server
npm run dev

# You should see:
# Server started on http://127.0.0.1:5000
# Socket.IO listening on ws://127.0.0.1:5000
# [Socket.IO] Initialized
# [Auction Scheduler] Started
```

### Step 4: Start the Client
```bash
cd client
npm run dev

# You should see:
# VITE v[version]
# Local: http://localhost:5173
```

### Step 5: Test Real-Time Bidding
1. Open browser to `http://localhost:5173`
2. Sign in (or use existing session)
3. Navigate to any auction detail page
4. Open browser console (F12)
5. Look for: `[Socket.IO] Connected: <socket-id>`
6. Look for: `[Socket.IO] Joined auction: <auction-id>`
7. Place a bid
8. Watch for real-time update in the bid history!

---

## 🧪 Testing Scenarios

### Scenario 1: Basic Real-Time Bid
**Goal**: Verify bids update in real-time

1. Open auction page in two different browsers (or incognito)
2. Sign in as different users in each browser
3. Place a bid in Browser 1
4. **Expected**: Browser 2 should instantly show the new bid
5. **Check**: Bid history updates without page refresh
6. **Check**: Current bid amount updates
7. **Check**: Bid count increments

**Success Criteria**:
- ✅ Bid appears in both browsers within 100ms
- ✅ Bidder name is anonymized (e.g., "J***n D*e")
- ✅ Leading badge shows on highest bid
- ✅ Console shows `[Socket.IO] Placed bid: X EGP`

---

### Scenario 2: Rate Limiting
**Goal**: Verify 1 bid/second limit works

1. Open auction page
2. Place a bid
3. **Immediately** try to place another bid (within 1 second)
4. **Expected**: Error message: "Please wait X seconds before bidding again"
5. Wait 1 second
6. Place bid again
7. **Expected**: Bid succeeds

**Success Criteria**:
- ✅ Second bid fails with rate limit error
- ✅ Third bid succeeds after 1 second
- ✅ Error appears in bid error section (red box)

---

### Scenario 3: Outbid Notification
**Goal**: Verify users are notified when outbid

1. Open auction in Browser 1 (User A)
2. Open same auction in Browser 2 (User B)
3. User A places a bid
4. **Expected in Browser 1**: "Your bid of EGP X is now live" (green notification)
5. User B places a higher bid
6. **Expected in Browser 1**: 
   - Toast notification: "You've been outbid!"
   - Local notification in page: "You've been outbid! Your bid: EGP X → New bid: EGP Y"
7. **Expected in Browser 2**: "Your bid of EGP Y is now live"

**Success Criteria**:
- ✅ User A sees outbid notification instantly
- ✅ Notification shows old and new bid amounts
- ✅ Browser 2 doesn't see outbid notification (they're leading)

---

### Scenario 4: Auction Auto-Extension
**Goal**: Verify auction extends when bid placed in last 5 minutes

**Setup**:
```sql
-- Create a test auction ending in 4 minutes
UPDATE auctions 
SET end_time = CURRENT_TIMESTAMP + INTERVAL '4' MINUTE,
    auto_extend_enabled = 1,
    auto_extend_threshold_minutes = 5,
    auto_extend_duration_minutes = 5
WHERE id = 'your-test-auction-id';
COMMIT;
```

**Test**:
1. Open auction page
2. Wait for countdown to show < 5 minutes remaining
3. Place a bid
4. **Expected**: 
   - Success message includes "extended: true"
   - End time updates to +5 minutes
   - Countdown resets to new end time
5. Check server console for: `[Bid Processing] Auto-extended auction`

**Success Criteria**:
- ✅ Countdown extends by 5 minutes
- ✅ `newEndTime` field in response is populated
- ✅ All connected browsers see updated end time

---

### Scenario 5: Auction Scheduler
**Goal**: Verify scheduler runs and detects ending auctions

**Setup**:
```sql
-- Create auction ending in 4 minutes
INSERT INTO auctions (id, vehicle_id, seller_id, status, end_time, 
                      starting_bid_egp, current_bid_egp, reserve_met, 
                      auto_extend_enabled)
VALUES ('test-ending-auction', 'some-vehicle-id', 'some-seller-id', 'live',
        CURRENT_TIMESTAMP + INTERVAL '4' MINUTE, 
        50000, 50000, 0, 0);
COMMIT;
```

**Test**:
1. Open auction page
2. Wait 30 seconds (scheduler interval)
3. **Expected in server console**: `[Auction Scheduler] Running...`
4. Wait until < 5 minutes remaining
5. **Expected in server console**: `[Scheduler] Auction ending soon: test-ending-auction`
6. **Expected in browser**: Notification: "Auction ending in 4 minutes!"
7. Wait until auction ends
8. **Expected**: 
   - Server console: `[Scheduler] Auction ended: test-ending-auction`
   - Browser: "Auction has ended. Bidding is closed."
   - Status changes to 'ended'

**Success Criteria**:
- ✅ Scheduler logs appear every 30 seconds
- ✅ "Ending soon" notification at 5-minute mark
- ✅ Winner declared when auction ends
- ✅ Status updates to 'ended' in database

---

### Scenario 6: Webhook Subscription
**Goal**: Verify webhook registration and delivery

**Test**:
1. Start a local webhook receiver:
```bash
# Install webhook testing tool
npm install -g webhook

# Start receiver on port 8080
webhook -port 8080
```

2. Subscribe to webhook:
```bash
curl -X POST http://localhost:5000/api/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventType": "bid.placed",
    "url": "http://localhost:8080/webhook"
  }'
```

3. **Expected Response**:
```json
{
  "subscriptionId": "uuid-here",
  "secretKey": "64-char-key-here"
}
```

4. Place a bid on any auction
5. **Expected**: Webhook receiver logs show POST request:
```json
{
  "event": "bid.placed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "auctionId": "...",
    "bidId": "...",
    "amount": 55000,
    "bidderId": "..."
  }
}
```

6. Verify signature:
```javascript
const crypto = require('crypto');
const signature = req.headers['x-webhook-signature'];
const body = JSON.stringify(req.body);
const hmac = crypto.createHmac('sha256', secretKey);
hmac.update(body);
const computedSignature = hmac.digest('hex');

console.log('Valid:', signature === computedSignature); // Should be true
```

**Success Criteria**:
- ✅ Subscription created successfully
- ✅ Webhook delivered within 1 second of bid
- ✅ Signature verification passes
- ✅ Retry logic works (test by stopping receiver)

---

### Scenario 7: Concurrent Bidding (Race Condition Test)
**Goal**: Verify row-level locking prevents double bids

**Test**:
1. Open auction in 3 browsers (User A, B, C)
2. All three users prepare to bid EGP 55,000
3. **Simultaneously** click "Place Bid" in all three browsers (within 100ms)
4. **Expected**: 
   - Only ONE bid succeeds (first to acquire lock)
   - Other two get error: "Minimum bid is EGP 55,500" (or similar)
5. Check database:
```sql
SELECT bidder_id, amount_egp, created_at 
FROM bids 
WHERE auction_id = 'your-test-auction-id'
ORDER BY created_at DESC
FETCH FIRST 3 ROWS ONLY;
```

**Success Criteria**:
- ✅ Only one bid of EGP 55,000 in database
- ✅ No duplicate bids with same amount
- ✅ Other browsers receive updated current bid immediately
- ✅ No database deadlocks (check server console)

---

## 🐛 Troubleshooting

### Issue: "Socket.IO connection refused"
**Symptoms**: Browser console shows connection error

**Solution**:
1. Check server is running on port 5000
2. Verify CORS configuration in `server/server.js`:
```javascript
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Must match client URL
        methods: ['GET', 'POST'],
        credentials: true
    }
});
```
3. Check client `.env` file:
```env
VITE_API_URL=http://localhost:5000
```

---

### Issue: "Bid not updating in real-time"
**Symptoms**: Bids only show after page refresh

**Solution**:
1. Open browser console, check for WebSocket connection:
```
[Socket.IO] Connected: abc123
[Socket.IO] Joined auction: auction-id-here
```
2. If not connected, verify `initializeSocket()` is called in useEffect
3. Check server logs for socket connections:
```
[Socket.IO] User authenticated: user-id-here
[Socket.IO] User joined auction: auction-id-here
```
4. Verify `io.to()` calls in `server/routes/auctions.js`:
```javascript
const io = getIO();
io.to(`auction:${req.params.id}`).emit('bid_placed', { ... });
```

---

### Issue: "Rate limit not working"
**Symptoms**: Can place multiple bids per second

**Solution**:
1. Verify rate limiter middleware is imported in `auctions.js`:
```javascript
const { rateLimitBid } = require('../middleware/rateLimiter');
router.post('/:id/bids', auth, rateLimitBid, async (req, res) => { ... });
```
2. Check `rateLimiter.js` for proper Map storage:
```javascript
const bidAttempts = new Map(); // Should be at module level
```
3. Test manually:
```bash
# Should succeed
curl -X POST http://localhost:5000/api/auctions/123/bids \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 55000}'

# Should fail with 429
curl -X POST http://localhost:5000/api/auctions/123/bids \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 56000}'
```

---

### Issue: "Anonymized names showing as undefined"
**Symptoms**: Bid history shows "undefined" as bidder name

**Solution**:
1. Check `anonymizeBidder.js` is being called in `bidProcessingService.js`:
```javascript
const { formatBidderName } = require('../utils/anonymizeBidder');
const anonymizedBidder = await formatBidderName(bidder, null, auctionId);
```
2. Verify users table has `first_name` and `last_name` columns:
```sql
SELECT first_name, last_name FROM users WHERE id = 'user-id-here';
```
3. Check cache is working (should log "Cache hit" after first fetch):
```
[Anonymize Bidder] Cache miss for user: abc123
[Anonymize Bidder] Fetched name: John Doe
[Anonymize Bidder] Cache hit for user: abc123
```

---

### Issue: "Auction not auto-extending"
**Symptoms**: Bids placed in last 5 minutes don't extend auction

**Solution**:
1. Verify auction has auto-extend enabled:
```sql
UPDATE auctions 
SET auto_extend_enabled = 1,
    auto_extend_threshold_minutes = 5,
    auto_extend_duration_minutes = 5
WHERE id = 'auction-id';
COMMIT;
```
2. Check `bidProcessingService.js` calls `handleAutoExtension()`:
```javascript
const wasExtended = await handleAutoExtension(auction, connection);
```
3. Verify time calculation is correct:
```javascript
const timeUntilEnd = new Date(auction.END_TIME).getTime() - Date.now();
const thresholdMs = Number(auction.AUTO_EXTEND_THRESHOLD_MINUTES) * 60 * 1000;
console.log('Time until end:', timeUntilEnd, 'Threshold:', thresholdMs);
```

---

### Issue: "Webhooks not being delivered"
**Symptoms**: No HTTP requests received at webhook URL

**Solution**:
1. Check webhook subscription is active:
```sql
SELECT * FROM WEBHOOK_SUBSCRIPTIONS 
WHERE user_id = 'your-user-id' AND is_active = 1;
```
2. Check webhook delivery log for errors:
```sql
SELECT id, event_type, response_status, response_body, attempt_number
FROM WEBHOOK_DELIVERY_LOG 
WHERE subscription_id = 'your-sub-id'
ORDER BY delivered_at DESC;
```
3. Verify URL is accessible from server:
```bash
# From server machine
curl -X POST http://your-webhook-url/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
4. Check retry logic in `webhookService.js`:
```javascript
console.log(`[Webhook Service] Delivering to ${subscription.URL} (attempt ${retryCount + 1}/3)`);
```

---

## 📊 Monitoring

### Server Logs to Watch
```bash
# Successful bid processing
[Bid Processing] Processing bid: amount=55000, auction=abc123

# Socket.IO events
[Socket.IO] User joined auction: auction-id
[Socket.IO] Broadcasting bid_placed to auction:auction-id

# Scheduler activity
[Auction Scheduler] Running...
[Scheduler] Checking 12 live auctions
[Scheduler] Auction ending soon: auction-123 (3 minutes left)

# Webhook delivery
[Webhook Service] Delivering to https://example.com/webhook (attempt 1/3)
[Webhook Service] Delivered successfully: status 200

# Rate limiting
[Rate Limiter] User user-123 bid rate limited (retry in 0.5s)
```

### Database Queries for Monitoring
```sql
-- Active websocket connections (check server logs)
-- Count recent bids
SELECT COUNT(*) as recent_bids
FROM bids
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1' HOUR;

-- Count active webhooks
SELECT event_type, COUNT(*) as subscriptions
FROM WEBHOOK_SUBSCRIPTIONS
WHERE is_active = 1
GROUP BY event_type;

-- Check webhook delivery success rate
SELECT 
    event_type,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN response_status = 200 THEN 1 ELSE 0 END) as successful,
    ROUND(SUM(CASE WHEN response_status = 200 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM WEBHOOK_DELIVERY_LOG
WHERE delivered_at > CURRENT_TIMESTAMP - INTERVAL '1' DAY
GROUP BY event_type;

-- Find auctions with recent high bid activity
SELECT 
    a.id,
    a.vehicle_id,
    COUNT(b.id) as bid_count,
    MAX(b.created_at) as last_bid_time
FROM auctions a
LEFT JOIN bids b ON a.id = b.auction_id
WHERE a.status = 'live'
    AND b.created_at > CURRENT_TIMESTAMP - INTERVAL '10' MINUTE
GROUP BY a.id, a.vehicle_id
HAVING COUNT(b.id) > 5
ORDER BY bid_count DESC;
```

---

## ✅ Final Checklist

Before considering the implementation complete:

### Backend
- [ ] Database migration executed successfully
- [ ] Socket.IO server starts without errors
- [ ] Auction scheduler logs appear every 30 seconds
- [ ] Rate limiter prevents >1 bid/second
- [ ] Webhook subscriptions can be created
- [ ] Webhook delivery logs show successful deliveries
- [ ] Anonymized names working (J***n D*e format)

### Frontend
- [ ] Socket.IO connection established in browser
- [ ] Bid history component renders with animations
- [ ] Real-time bid updates work across browsers
- [ ] Outbid notifications appear correctly
- [ ] "You" label shows for user's own bids
- [ ] Auction ending countdown updates
- [ ] No console errors on page load

### Integration
- [ ] Concurrent bids handled without race conditions
- [ ] Auto-extension works when bid in last 5 minutes
- [ ] All 5 webhook events trigger correctly
- [ ] Bid validation errors display properly
- [ ] Socket.IO rooms isolate auction events
- [ ] Authentication works via JWT handshake

---

## 🎉 Success!

If all tests pass, your real-time auction system is **production-ready**! 

**What you've built**:
- ✅ Sub-100ms bid updates
- ✅ Anonymous bidder names with smart permissions
- ✅ Webhook integrations for external systems
- ✅ Race condition protection with row-level locking
- ✅ Auto-extending auctions for competitive bidding
- ✅ Beautiful real-time UI with animations
- ✅ Comprehensive error handling
- ✅ Scalable architecture (ready for Redis upgrade)

**Next Steps**:
1. Load testing with 100+ concurrent users
2. Deploy to staging environment
3. Set up monitoring alerts (New Relic, Datadog, etc.)
4. Consider Redis for horizontal scaling
5. Add analytics dashboard for bid patterns

**Need Help?**
Review the [REALTIME_AUCTION_IMPLEMENTATION.md](./REALTIME_AUCTION_IMPLEMENTATION.md) for detailed documentation.
