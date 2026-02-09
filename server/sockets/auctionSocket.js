const jwt = require('jsonwebtoken');
const bidProcessingService = require('../services/bidProcessingService');
const webhookService = require('../services/webhookService');
const auctionScheduler = require('../services/auctionScheduler');
const { checkSocketRateLimit } = require('../middleware/rateLimiter');
const { formatBidderName } = require('../utils/anonymizeBidder');
const db = require('../config/db');
const oracledb = require('oracledb');

/**
 * Socket.IO Auction Handler
 * Manages real-time auction connections, bid events, and broadcasts
 */

/**
 * Authenticate socket connection
 * @param {Object} socket - Socket instance
 * @returns {Promise<Object|null>} - User object { id, role } or null
 */
async function authenticateSocket(socket) {
  let connection;
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      console.error('Socket auth: no userId in token payload');
      return null;
    }

    // Fetch user from DB (same as HTTP auth middleware)
    connection = await db.getConnection();
    const result = await connection.execute(
      `SELECT ID, ROLE, IS_ACTIVE, IS_BANNED FROM USERS WHERE ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      console.error('Socket auth: user not found for userId', userId);
      return null;
    }

    const user = result.rows[0];

    if (user.IS_BANNED === 'Y' || user.IS_ACTIVE === 'N') {
      console.error('Socket auth: user is banned or inactive', userId);
      return null;
    }

    return { id: user.ID, role: user.ROLE };
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    return null;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { /* ignore */ }
    }
  }
}

/**
 * Get auction details
 * @param {string} auctionId - Auction ID
 * @returns {Promise<Object|null>} - Auction object or null
 */
async function getAuctionDetails(auctionId) {
  let connection;
  try {
    connection = await db.getConnection();

    const result = await connection.execute(
      `SELECT
        a.id,
        a.seller_id,
        a.status,
        a.end_time,
        a.current_bid_egp,
        a.bid_count,
        a.leading_bidder_id,
        a.min_bid_increment,
        v.make,
        v.model,
        v.year_mfg
      FROM auctions a
      JOIN vehicles v ON a.vehicle_id = v.id
      WHERE a.id = :auctionId`,
      { auctionId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      sellerId: row.SELLER_ID,
      status: row.STATUS,
      endTime: row.END_TIME,
      currentBid: Number(row.CURRENT_BID_EGP),
      bidCount: Number(row.BID_COUNT),
      leadingBidderId: row.LEADING_BIDDER_ID,
      minBidIncrement: Number(row.MIN_BID_INCREMENT),
      vehicle: {
        make: row.MAKE,
        model: row.MODEL,
        year: row.YEAR_MFG
      }
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Connection close error:', err);
      }
    }
  }
}

/**
 * Initialize Socket.IO auction handler
 * @param {Object} io - Socket.IO server instance
 */
function initializeAuctionSocket(io) {
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    // Authenticate user
    const user = await authenticateSocket(socket);
    if (!user) {
      console.log(`[Socket.IO] Unauthenticated connection rejected: ${socket.id}`);
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    socket.userId = user.id;
    socket.userRole = user.role;

    // Join user's personal room for notifications
    socket.join(`user:${user.id}`);

    console.log(`[Socket.IO] User ${user.id} authenticated`);

    // ===== JOIN_AUCTION Event =====
    socket.on('join_auction', async (data) => {
      const { auctionId } = data;

      if (!auctionId) {
        socket.emit('error', { message: 'Auction ID required' });
        return;
      }

      try {
        // Get auction details
        const auction = await getAuctionDetails(auctionId);

        if (!auction) {
          socket.emit('error', { message: 'Auction not found' });
          return;
        }

        // Join auction room
        socket.join(`auction:${auctionId}`);
        socket.currentAuctionId = auctionId;

        // Send current auction state
        socket.emit('auction_joined', {
          auctionId: auction.id,
          currentBid: auction.currentBid,
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          status: auction.status,
          minBidIncrement: auction.minBidIncrement
        });

        // Get and send recent bids
        const recentBids = await bidProcessingService.getRecentBids(auctionId, 10);
        const formattedBids = recentBids.map(bid => ({
          id: bid.id,
          amount: bid.amount,
          timestamp: bid.timestamp,
          displayName: formatBidderName(
            { id: bid.bidderId, firstName: bid.firstName, lastName: bid.lastName },
            user.id,
            user.role,
            auction.sellerId,
            bid.bidderId === user.id
          ),
          isYou: bid.bidderId === user.id
        }));

        socket.emit('bid_history', { bids: formattedBids });

        console.log(`[Socket.IO] User ${user.id} joined auction ${auctionId}`);
      } catch (err) {
        console.error(`[Socket.IO] Error joining auction:`, err);
        socket.emit('error', { message: 'Failed to join auction' });
      }
    });

    // ===== PLACE_BID Event =====
    socket.on('place_bid', async (data) => {
      const { auctionId, amount } = data;

      if (!auctionId || !amount) {
        socket.emit('bid_error', { message: 'Auction ID and amount required' });
        return;
      }

      try {
        // Rate limit check
        const rateLimit = checkSocketRateLimit(user.id);
        if (!rateLimit.allowed) {
          socket.emit('bid_error', {
            message: rateLimit.message,
            retryAfter: rateLimit.retryAfter
          });
          return;
        }

        // Get database connection
        const connection = await db.getConnection();

        try {
          // Get auction details for notification
          const auction = await getAuctionDetails(auctionId);

          // Process bid
          const result = await bidProcessingService.processBid(
            auctionId,
            user.id,
            amount,
            'manual',
            socket.handshake.address,
            connection
          );

          if (!result.success) {
            socket.emit('bid_error', { message: result.error });
            return;
          }

          // Emit success to bidder
          socket.emit('bid_placed', {
            bid: result.bid,
            autoExtended: result.autoExtended,
            autoExtendInfo: result.autoExtendInfo
          });

          // Get bidder info for broadcast
          const bidderInfoResult = await connection.execute(
            `SELECT first_name, last_name FROM users WHERE id = :userId`,
            { userId: user.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          const bidderInfo = bidderInfoResult.rows[0];

          // Broadcast to all users in auction room
          io.to(`auction:${auctionId}`).emit('auction_updated', {
            auctionId,
            currentBid: amount,
            bidCount: auction.bidCount + 1,
            leadingBidderId: user.id,
            newBid: {
              id: result.bid.id,
              amount,
              timestamp: result.bid.timestamp,
              displayName: 'New bid', // Will be replaced by client based on viewer
              isYou: false // Each client determines this
            },
            autoExtended: result.autoExtended,
            newEndTime: result.autoExtendInfo?.newEndTime
          });

          // Notify previous leading bidder (outbid)
          if (auction.leadingBidderId && auction.leadingBidderId !== user.id) {
            const vehicleDesc = `${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`;
            
            await auctionScheduler.createNotification(
              auction.leadingBidderId,
              'auction_outbid',
              'You\'ve Been Outbid!',
              `Someone bid EGP ${amount.toLocaleString()} on ${vehicleDesc}. Place a higher bid to stay in the lead.`,
              auctionId
            );

            // Trigger webhook
            await webhookService.triggerWebhook('user.outbid', {
              auctionId,
              vehicle: vehicleDesc,
              newBid: amount,
              previousBid: auction.currentBid
            }, auction.leadingBidderId);
          }

          // Trigger bid.placed webhook
          await webhookService.triggerWebhook('bid.placed', {
            auctionId,
            bidderId: user.id,
            amount,
            timestamp: result.bid.timestamp
          });

          console.log(`[Socket.IO] Bid placed: ${auctionId} - ${amount} by ${user.id}`);
        } finally {
          await connection.close();
        }
      } catch (err) {
        console.error(`[Socket.IO] Error placing bid:`, err);
        socket.emit('bid_error', { message: 'Failed to process bid' });
      }
    });

    // ===== LEAVE_AUCTION Event =====
    socket.on('leave_auction', (data) => {
      const { auctionId } = data;

      if (auctionId && socket.currentAuctionId === auctionId) {
        socket.leave(`auction:${auctionId}`);
        socket.currentAuctionId = null;
        console.log(`[Socket.IO] User ${user.id} left auction ${auctionId}`);
      }
    });

    // ===== DISCONNECT Event =====
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${user.id} disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Auction handler initialized');
}

module.exports = initializeAuctionSocket;
