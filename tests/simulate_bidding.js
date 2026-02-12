/**
 * Real-Time Bidding Verification Script
 *
 * Proves that two users in the same auction room receive real-time updates.
 *
 * Simulation:
 *   1. Client A and Client B connect to the Socket.IO server.
 *   2. Both join the same auction room.
 *   3. Client A emits a `place_bid` event.
 *   4. Client B must receive the `auction_updated` event within 200ms.
 *
 * Usage:
 *   Set the following environment variables before running:
 *     SERVER_URL    – Socket.IO server URL (default: http://localhost:5000)
 *     AUCTION_ID    – ID of an existing LIVE auction
 *     TOKEN_A       – JWT for authenticated user A (bidder)
 *     TOKEN_B       – JWT for authenticated user B (observer)
 *     BID_AMOUNT    – Amount to bid (must be valid for the auction)
 *
 *   node tests/simulate_bidding.js
 */

const { io } = require('socket.io-client');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AUCTION_ID = process.env.AUCTION_ID || 'test-auction-001';
const TOKEN_A = process.env.TOKEN_A || '';
const TOKEN_B = process.env.TOKEN_B || '';
const BID_AMOUNT = Number(process.env.BID_AMOUNT) || 10000;
const TIMEOUT_MS = 200; // Maximum acceptable latency

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createClient(name, token) {
  const opts = {
    transports: ['websocket'],
    reconnection: false,
  };

  if (token) {
    opts.auth = { token };
  }

  const client = io(SERVER_URL, opts);

  client.on('connect', () => {
    console.log(`[${name}] ✅ Connected — socket id: ${client.id}`);
  });

  client.on('connect_error', (err) => {
    console.error(`[${name}] ❌ Connection error: ${err.message}`);
  });

  client.on('disconnect', (reason) => {
    console.log(`[${name}] Disconnected: ${reason}`);
  });

  client.on('error', (err) => {
    console.error(`[${name}] Server error:`, err);
  });

  return client;
}

function waitForEvent(client, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for "${eventName}" after ${timeoutMs}ms`));
    }, timeoutMs);

    client.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('========================================');
  console.log('  Real-Time Bidding Verification Script');
  console.log('========================================');
  console.log(`Server    : ${SERVER_URL}`);
  console.log(`Auction   : ${AUCTION_ID}`);
  console.log(`Bid Amount: ${BID_AMOUNT}`);
  console.log(`Timeout   : ${TIMEOUT_MS}ms`);
  console.log('');

  // 1. Create clients
  const clientA = createClient('Client A', TOKEN_A);
  const clientB = createClient('Client B', TOKEN_B);

  try {
    // Wait for both clients to connect
    await Promise.all([
      waitForEvent(clientA, 'connect', 5000),
      waitForEvent(clientB, 'connect', 5000),
    ]);

    console.log('\n[Step 1] Both clients connected.\n');

    // 2. Both join the same auction room
    clientA.emit('join_auction', { auctionId: AUCTION_ID });
    clientB.emit('join_auction', { auctionId: AUCTION_ID });

    // Wait for auction_joined events
    const [joinedA, joinedB] = await Promise.all([
      waitForEvent(clientA, 'auction_joined', 5000),
      waitForEvent(clientB, 'auction_joined', 5000),
    ]);

    console.log(`[Step 2] Client A joined auction — current bid: ${joinedA.currentBid}`);
    console.log(`[Step 2] Client B joined auction — current bid: ${joinedB.currentBid}\n`);

    // 3. Client A places a bid, Client B listens for the update
    const bidStart = Date.now();

    const updatePromise = waitForEvent(clientB, 'auction_updated', TIMEOUT_MS);

    // Small delay to ensure the listener is registered before emitting
    await new Promise((r) => setTimeout(r, 10));

    clientA.emit('place_bid', { auctionId: AUCTION_ID, amount: BID_AMOUNT });
    console.log(`[Step 3] Client A placed bid of ${BID_AMOUNT}. Waiting for Client B…\n`);

    const updateData = await updatePromise;
    const latency = Date.now() - bidStart;

    // 4. Evaluate result
    console.log('========================================');
    console.log('  RESULT');
    console.log('========================================');
    console.log(`Client B received auction_updated in ${latency}ms`);
    console.log(`  currentBid : ${updateData.currentBid}`);
    console.log(`  bidCount   : ${updateData.bidCount}`);
    console.log(`  auctionId  : ${updateData.auctionId}`);

    if (latency <= TIMEOUT_MS) {
      console.log(`\n✅ PASS — Update received within ${TIMEOUT_MS}ms threshold (${latency}ms)`);
      process.exitCode = 0;
    } else {
      console.log(`\n❌ FAIL — Latency ${latency}ms exceeds ${TIMEOUT_MS}ms threshold`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`\n❌ FAIL — ${err.message}`);
    process.exitCode = 1;
  } finally {
    clientA.disconnect();
    clientB.disconnect();
  }
}

main();
